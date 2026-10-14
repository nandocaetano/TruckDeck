// TruckDeck input helper.
// Compiled at startup by input-helper.ps1 (Windows PowerShell 5.1 => C# 5 syntax only:
// no string interpolation, no "?.", no expression-bodied members).
//
// Jobs, one process:
//   1. Read "d <scancode> <extended>" / "u <scancode> <extended>" lines on stdin and inject
//      them with SendInput as hardware SCANCODES. Games built on DirectInput / raw input
//      (ETS2, ATS, Farming Simulator) ignore virtual-key events, so scancodes are mandatory.
//   2. Poll the "Local\SCSTelemetry" shared memory written by the scs-sdk-plugin DLL and
//      print one JSON line on stdout whenever the values the panel cares about change.
//   3. On "c <id> <x> <y> <w> <h> <maxWidth>", grab that part of the GAME WINDOW and
//      print it as a base64 JPEG (the panel's "game GPS" mirror).
//   5. Report what the desktop music player is playing (read from its window title) and
//      press the system media keys for the panel's music player.
//   4. Give keyboard focus back to the game when the panel itself is the focused window
//      (panel shown on a second monitor of the same PC).
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Globalization;
using System.IO;
using System.IO.MemoryMappedFiles;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace TruckDeck
{
    public static class InputHelper
    {
        // ---- SendInput interop -------------------------------------------------------------
        // The union must contain MOUSEINPUT (the largest member) so that Marshal.SizeOf(INPUT)
        // matches what user32 expects (40 bytes on x64). A keyboard-only struct is rejected.
        [StructLayout(LayoutKind.Sequential)]
        private struct MOUSEINPUT
        {
            public int dx; public int dy; public uint mouseData; public uint dwFlags;
            public uint time; public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct KEYBDINPUT
        {
            public ushort wVk; public ushort wScan; public uint dwFlags;
            public uint time; public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Explicit)]
        private struct InputUnion
        {
            [FieldOffset(0)] public MOUSEINPUT mi;
            [FieldOffset(0)] public KEYBDINPUT ki;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct INPUT
        {
            public uint type;
            public InputUnion u;
        }

        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        private const uint INPUT_KEYBOARD = 1;
        private const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
        private const uint KEYEVENTF_KEYUP = 0x0002;
        private const uint KEYEVENTF_SCANCODE = 0x0008;

        [DllImport("user32.dll")] private static extern short GetAsyncKeyState(int vKey);
        [DllImport("user32.dll")] private static extern bool SetProcessDPIAware();
        [DllImport("user32.dll")] private static extern int GetSystemMetrics(int index);
        [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr hWnd);
        [DllImport("user32.dll")] private static extern bool IsWindow(IntPtr hWnd);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int maxCount);

        private static readonly object OutLock = new object();

        private static void Emit(string line)
        {
            // stdout is shared by the stdin loop and the telemetry thread
            lock (OutLock)
            {
                Console.Out.WriteLine(line);
                Console.Out.Flush();
            }
        }

        // Media and volume keys are sent as VIRTUAL keys: Windows itself consumes them (they
        // never reach a game), and it recognises them by key code, not by scancode.
        private static void VirtualKey(ushort vk, bool up)
        {
            INPUT[] inputs = new INPUT[1];
            inputs[0].type = INPUT_KEYBOARD;
            inputs[0].u.ki.wVk = vk;
            inputs[0].u.ki.dwFlags = up ? KEYEVENTF_KEYUP : 0;
            SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
        }

        private static void Key(ushort scan, bool extended, bool up)
        {
            INPUT[] inputs = new INPUT[1];
            inputs[0].type = INPUT_KEYBOARD;
            inputs[0].u.ki.wVk = 0; // 0 + SCANCODE flag => "physical key", what games listen to
            inputs[0].u.ki.wScan = scan;
            uint flags = KEYEVENTF_SCANCODE;
            if (extended) flags |= KEYEVENTF_EXTENDEDKEY;
            if (up) flags |= KEYEVENTF_KEYUP;
            inputs[0].u.ki.dwFlags = flags;
            uint sent = SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
            if (sent == 0)
            {
                // Typical cause: the game runs elevated (admin) and the bridge does not (UIPI).
                Emit("{\"type\":\"error\",\"msg\":\"SendInput blocked (win32 error "
                     + Marshal.GetLastWin32Error().ToString(CultureInfo.InvariantCulture) + ")\"}");
            }
        }

        // ---- Focus hand-back (second monitor) ---------------------------------------------
        // SendInput types into whichever window has focus. A tablet never takes focus away
        // from the game, but clicking the panel in a browser on the same PC does. So the
        // helper remembers the last focused window that was NOT the panel, and hands focus
        // back to it right before typing.
        private const string PanelTitleMarker = "Truck Sim Button Box"; // the page <title>, shown in the browser's window title
        private static IntPtr lastOtherWindow = IntPtr.Zero;

        private static string TitleOf(IntPtr hWnd)
        {
            StringBuilder sb = new StringBuilder(256);
            GetWindowText(hWnd, sb, sb.Capacity);
            return sb.ToString();
        }

        private static void TrackForeground()
        {
            IntPtr fg = GetForegroundWindow();
            if (fg == IntPtr.Zero) return;
            if (TitleOf(fg).IndexOf(PanelTitleMarker, StringComparison.OrdinalIgnoreCase) < 0) lastOtherWindow = fg;
        }

        private static void GiveFocusBackToGame()
        {
            IntPtr fg = GetForegroundWindow();
            if (fg == IntPtr.Zero || lastOtherWindow == IntPtr.Zero || !IsWindow(lastOtherWindow)) return;
            if (TitleOf(fg).IndexOf(PanelTitleMarker, StringComparison.OrdinalIgnoreCase) < 0) return; // game already focused
            // Windows only lets a background process change the foreground window right after
            // it generated input itself; a tap on Alt is the conventional way to earn that.
            Key(0x38, false, false);
            Key(0x38, false, true);
            SetForegroundWindow(lastOtherWindow);
            Thread.Sleep(60); // let the game notice it has focus before the key arrives
        }

        // ---- Now playing -------------------------------------------------------------------
        // Desktop music players put the current track in their main window title. Reading it
        // needs no login, no API key and no paid plan, and nothing leaves the PC.
        //   player A: "Artist - Song" while playing, the app name while paused
        //   player B: "Song - Artist - <app name>" while playing, the app name otherwise
        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
        [DllImport("user32.dll")] private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);

        private static string JsonString(string text)
        {
            // Everything outside printable ASCII becomes \uXXXX, so accents and Cyrillic
            // survive whatever code page the console pipe happens to use.
            StringBuilder sb = new StringBuilder(text.Length + 16);
            sb.Append('"');
            foreach (char ch in text)
            {
                if (ch == '"' || ch == '\\') sb.Append('\\').Append(ch);
                else if (ch < 32 || ch > 126) sb.Append("\\u").Append(((int)ch).ToString("x4", CultureInfo.InvariantCulture));
                else sb.Append(ch);
            }
            sb.Append('"');
            return sb.ToString();
        }

        // Titles of every visible-or-hidden top-level window owned by a process with this name.
        // A player owns several windows (helpers, tray); the caller picks the one with a track.
        private static List<string> WindowTitlesOf(string processName)
        {
            List<string> titles = new List<string>();
            Process[] procs = Process.GetProcessesByName(processName);
            if (procs.Length == 0) return null; // null = player not running
            HashSet<uint> pids = new HashSet<uint>();
            foreach (Process pr in procs) { pids.Add((uint)pr.Id); pr.Dispose(); }
            EnumWindows(delegate(IntPtr hWnd, IntPtr lParam)
            {
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                if (!pids.Contains(pid)) return true;
                string title = TitleOf(hWnd);
                if (title.Length == 0 || title == "Default IME" || title == "MSCTFIME UI" || title.StartsWith("GDI+", StringComparison.Ordinal)) return true;
                titles.Add(title);
                return true;
            }, IntPtr.Zero);
            return titles;
        }

        private static string MediaLine(bool running, bool playing, string artist, string track)
        {
            return "{\"type\":\"media\",\"running\":" + (running ? "true" : "false") + ",\"playing\":" + (playing ? "true" : "false")
                 + ",\"artist\":" + JsonString(artist) + ",\"track\":" + JsonString(track) + "}";
        }

        private static string MediaJson()
        {
            bool anyRunning = false;

            // Player A: "Artist - Song". Split on the FIRST separator: song names contain dashes
            // far more often than artist names do.
            List<string> a = WindowTitlesOf("Spotify");
            if (a != null)
            {
                anyRunning = true;
                foreach (string title in a)
                {
                    int cut = title.IndexOf(" - ", StringComparison.Ordinal);
                    if (cut > 0) return MediaLine(true, true, title.Substring(0, cut), title.Substring(cut + 3));
                }
            }

            // Player B: "Song - Artist - Deezer". The app name is cut off the end, then the LAST
            // separator divides song from artist, for the same reason as above.
            List<string> b = WindowTitlesOf("Deezer");
            if (b != null)
            {
                anyRunning = true;
                foreach (string title in b)
                {
                    const string suffix = " - Deezer";
                    if (!title.EndsWith(suffix, StringComparison.OrdinalIgnoreCase)) continue;
                    string rest = title.Substring(0, title.Length - suffix.Length);
                    int cut = rest.LastIndexOf(" - ", StringComparison.Ordinal);
                    if (cut > 0) return MediaLine(true, true, rest.Substring(cut + 3), rest.Substring(0, cut));
                    if (rest.Length > 0) return MediaLine(true, true, "", rest);
                }
            }

            return MediaLine(anyRunning, false, "", "");
        }

        // ---- Capture guard: only while the game is in front --------------------------------
        // The GPS mirror is a screen grab, so without this it would send the tablet whatever
        // sits in that corner of the screen: a browser, a chat, the desktop. The check lives
        // here, on the PC, so no client can ask its way around it.
        [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

        // Lower-case process-name prefixes, overridable with TRUCKDECK_CAPTURE_APPS (comma list).
        private static string[] captureApps = new string[] { "eurotrucks2", "amtrucks", "farmingsimulator" };

        private static bool IsGameWindow(IntPtr hWnd)
        {
            try
            {
                uint pid;
                GetWindowThreadProcessId(hWnd, out pid);
                if (pid == 0) return false;
                string name;
                using (Process proc = Process.GetProcessById((int)pid)) { name = proc.ProcessName.ToLowerInvariant(); }
                foreach (string app in captureApps)
                {
                    if (app.Length > 0 && name.StartsWith(app, StringComparison.Ordinal)) return true;
                }
            }
            catch (Exception) { /* process exited or access denied: treat as "not the game" */ }
            return false;
        }

        private static bool GameInFront()
        {
            IntPtr fg = GetForegroundWindow();
            if (fg == IntPtr.Zero) return false;
            if (IsGameWindow(fg)) return true;
            // Second-monitor use: the panel's own browser window is focused for a moment after
            // each click. That still counts, as long as the window before it was the game.
            bool panelFocused = TitleOf(fg).IndexOf(PanelTitleMarker, StringComparison.OrdinalIgnoreCase) >= 0;
            return panelFocused && lastOtherWindow != IntPtr.Zero && IsWindow(lastOtherWindow) && IsGameWindow(lastOtherWindow);
        }

        // ---- Finding the game window --------------------------------------------------------
        [StructLayout(LayoutKind.Sequential)] private struct RECT { public int left, top, right, bottom; }
        [StructLayout(LayoutKind.Sequential)] private struct POINT { public int x, y; }
        [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr hWnd);
        [DllImport("user32.dll")] private static extern bool IsIconic(IntPtr hWnd);
        [DllImport("user32.dll")] private static extern bool GetClientRect(IntPtr hWnd, out RECT rect);
        [DllImport("user32.dll")] private static extern bool ClientToScreen(IntPtr hWnd, ref POINT point);
        [DllImport("user32.dll")] private static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);

        // The biggest visible window of a game process: the game itself, not its helper windows.
        private static IntPtr FindGameWindow()
        {
            IntPtr best = IntPtr.Zero;
            long bestArea = 0;
            EnumWindows(delegate(IntPtr hWnd, IntPtr lParam)
            {
                if (!IsWindowVisible(hWnd) || !IsGameWindow(hWnd)) return true;
                RECT r;
                if (!GetClientRect(hWnd, out r)) return true;
                long area = (long)(r.right - r.left) * (r.bottom - r.top);
                if (area > bestArea) { bestArea = area; best = hWnd; }
                return true;
            }, IntPtr.Zero);
            return best;
        }

        // ---- Game window capture (GPS mirror) -----------------------------------------------
        private static int capturing = 0; // 0/1 guard: never queue captures behind each other

        private static ImageCodecInfo JpegCodec()
        {
            foreach (ImageCodecInfo c in ImageCodecInfo.GetImageEncoders())
            {
                if (c.MimeType == "image/jpeg") return c;
            }
            return null;
        }

        // A handful of pixels across the picture: a frame that is black everywhere is what
        // Windows returns when it could not read the window's content.
        private static bool LooksBlack(Bitmap bmp)
        {
            for (int i = 1; i < 8; i++)
            {
                for (int j = 1; j < 8; j++)
                {
                    Color c = bmp.GetPixel(bmp.Width * i / 8, bmp.Height * j / 8);
                    if (c.R > 12 || c.G > 12 || c.B > 12) return false;
                }
            }
            return true;
        }

        // The picture is taken from the GAME WINDOW itself, in window coordinates:
        //   - it works on whichever monitor the game is, windowed or borderless;
        //   - nothing else on the PC can end up in it, whatever sits on top of the game.
        // Way 1 asks Windows for the window's own content (PrintWindow). Some setups return a
        // black frame there; way 2 then copies the same rectangle from the screen, which is
        // only allowed while the game is the window in front.
        private static void Capture(string id, IntPtr game, double fx, double fy, double fw, double fh, int maxW)
        {
            try
            {
                RECT cr;
                GetClientRect(game, out cr);
                int cw = cr.right - cr.left;
                int ch = cr.bottom - cr.top;
                if (cw < 64 || ch < 64) { Emit("{\"type\":\"frame\",\"id\":\"" + id + "\",\"error\":\"minimized\"}"); return; }
                int w = Math.Max(16, (int)(fw * cw));
                int h = Math.Max(16, (int)(fh * ch));
                int x = Math.Max(0, Math.Min(cw - w, (int)(fx * cw)));
                int y = Math.Max(0, Math.Min(ch - h, (int)(fy * ch)));

                using (Bitmap shot = new Bitmap(w, h, PixelFormat.Format24bppRgb))
                {
                    bool ok = false;
                    using (Bitmap whole = new Bitmap(cw, ch, PixelFormat.Format24bppRgb))
                    {
                        using (Graphics gw = Graphics.FromImage(whole))
                        {
                            IntPtr hdc = gw.GetHdc();
                            // 1 = client area only, 2 = include content drawn by the graphics card
                            try { ok = PrintWindow(game, hdc, 3); } finally { gw.ReleaseHdc(hdc); }
                        }
                        if (ok)
                        {
                            using (Graphics g = Graphics.FromImage(shot)) { g.DrawImage(whole, new Rectangle(0, 0, w, h), new Rectangle(x, y, w, h), GraphicsUnit.Pixel); }
                            ok = !LooksBlack(shot);
                        }
                    }
                    if (!ok)
                    {
                        if (!GameInFront()) { Emit("{\"type\":\"frame\",\"id\":\"" + id + "\",\"error\":\"behind\"}"); return; }
                        POINT origin = new POINT();
                        ClientToScreen(game, ref origin);
                        using (Graphics g = Graphics.FromImage(shot)) { g.CopyFromScreen(origin.x + x, origin.y + y, 0, 0, new Size(w, h)); }
                        if (LooksBlack(shot)) { Emit("{\"type\":\"frame\",\"id\":\"" + id + "\",\"error\":\"black\"}"); return; }
                    }
                    Bitmap output = shot;
                    // Shrink before encoding: a phone-sized widget does not need a 4K crop,
                    // and smaller frames keep Wi-Fi latency low.
                    if (w > maxW)
                    {
                        int outH = Math.Max(1, h * maxW / w);
                        output = new Bitmap(maxW, outH, PixelFormat.Format24bppRgb);
                        using (Graphics g2 = Graphics.FromImage(output))
                        {
                            g2.InterpolationMode = InterpolationMode.Bilinear;
                            g2.DrawImage(shot, 0, 0, maxW, outH);
                        }
                    }
                    using (MemoryStream ms = new MemoryStream())
                    {
                        EncoderParameters ep = new EncoderParameters(1);
                        ep.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 72L);
                        output.Save(ms, JpegCodec(), ep);
                        Emit("{\"type\":\"frame\",\"id\":\"" + id + "\",\"data\":\"" + Convert.ToBase64String(ms.ToArray()) + "\"}");
                    }
                    if (!object.ReferenceEquals(output, shot)) output.Dispose();
                }
            }
            catch (Exception ex)
            {
                Emit("{\"type\":\"frame\",\"id\":\"" + id + "\",\"error\":\"" + ex.GetType().Name + "\"}");
            }
            finally
            {
                Interlocked.Exchange(ref capturing, 0);
            }
        }

        private static double Frac(string text)
        {
            double v;
            if (!double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out v)) return 0;
            return Math.Max(0, Math.Min(1, v));
        }

        private static void HandleCapture(string[] p)
        {
            // p: c <id> <x> <y> <w> <h> <maxWidth>; id is digits only (it is echoed into JSON)
            string id = p[1];
            foreach (char ch in id) { if (ch < '0' || ch > '9') return; }
            IntPtr game = FindGameWindow();
            if (game == IntPtr.Zero)
            {
                Emit("{\"type\":\"frame\",\"id\":\"" + id + "\",\"error\":\"nogame\"}");
                return;
            }
            if (IsIconic(game))
            {
                Emit("{\"type\":\"frame\",\"id\":\"" + id + "\",\"error\":\"minimized\"}");
                return;
            }
            if (Interlocked.CompareExchange(ref capturing, 1, 0) != 0)
            {
                Emit("{\"type\":\"frame\",\"id\":\"" + id + "\",\"error\":\"busy\"}");
                return;
            }
            double fx = Frac(p[2]), fy = Frac(p[3]), fw = Frac(p[4]), fh = Frac(p[5]);
            int maxW;
            if (!int.TryParse(p[6], NumberStyles.Integer, CultureInfo.InvariantCulture, out maxW)) maxW = 480;
            maxW = Math.Max(160, Math.Min(1600, maxW));
            // Off the stdin thread: a screen grab must never delay a key press.
            ThreadPool.QueueUserWorkItem(delegate { Capture(id, game, fx, fy, fw, fh, maxW); });
        }

        // ---- Telemetry ---------------------------------------------------------------------
        // Offsets come from scs-telemetry-common.hpp (scs-sdk-plugin, PLUGIN_REVID 12).
        // The struct is organised in fixed "zones", so each offset below is zone start + the
        // sizes of the fields declared before it.
        private const int OFF_SDK_ACTIVE = 0;
        private const int OFF_PAUSED = 4;
        private const int OFF_PLUGIN_REV = 40;
        private const int OFF_GAME = 52;            // 1 = ETS2, 2 = ATS
        private const int OFF_TIME_ABS = 64;        // in-game minutes since the epoch
        private const int OFF_GEARS = 68;           // number of forward gears of this gearbox
        private const int OFF_RETARDER_STEPS = 76;
        private const int OFF_RETARDER_LEVEL = 108;
        private const int OFF_GEAR_DASHBOARD = 508; // >0 forward, 0 neutral, <0 reverse
        private const int OFF_FUEL_CAPACITY = 704;
        private const int OFF_SPEED = 948;          // m/s
        private const int OFF_RPM = 952;
        private const int OFF_CRUISE_SPEED = 988;   // m/s, 0 when cruise control is off
        private const int OFF_AIR_PRESSURE = 992;   // psi
        private const int OFF_FUEL = 1000;          // litres
        private const int OFF_WEAR_ENGINE = 1036;   // five consecutive floats 0..1: engine,
                                                    // transmission, cabin, chassis, wheels
        private const int OFF_ROUTE_DISTANCE = 1060; // metres left on the planned route
        private const int OFF_ROUTE_TIME = 1064;     // seconds left on the planned route
        private const int OFF_TRAILER0_CARGO_DAMAGE = 6152; // then wear chassis, wheels, body
        private const int OFF_TRUCK_BOOLS = 1566;   // start of truck_b (parkBrake first)
        private const int OFF_TRAILER0_ATTACHED = 6080;
        // On-board computer (job, mechanics, consumption)
        private const int OFF_DELIVERY_TIME = 88;    // in-game minute the cargo is due
        private const int OFF_PLANNED_KM = 100;      // length of the job as planned
        private const int OFF_ADBLUE_CAPACITY = 712;
        private const int OFF_CARGO_MASS = 748;      // kg
        private const int OFF_BRAKE_TEMP = 996;      // degrees C
        private const int OFF_FUEL_AVG = 1004;       // litres per km
        private const int OFF_FUEL_RANGE = 1008;     // km
        private const int OFF_ADBLUE = 1012;         // litres
        private const int OFF_OIL_PRESSURE = 1016;   // psi
        private const int OFF_OIL_TEMP = 1020;       // degrees C
        private const int OFF_WATER_TEMP = 1024;     // degrees C
        private const int OFF_BATTERY = 1028;        // volts
        private const int OFF_ODOMETER = 1056;       // km
        private const int OFF_SPEED_LIMIT = 1068;    // m/s, 0 = none known
        private const int OFF_STRINGS = 2300;        // 64-byte names: see Str() calls below
        private const int OFF_JOB_INCOME = 4000;     // 64-bit, game currency
        private const int OFF_ON_JOB = 4300;
        private const int VIEW_SIZE = 6200;

        // n-th 64-byte text of the string zone, as a JSON string (UTF-8, zero terminated)
        private static string Str(byte[] buf, int n)
        {
            int off = OFF_STRINGS + n * 64;
            int len = 0;
            while (len < 64 && buf[off + len] != 0) len++;
            return JsonString(Encoding.UTF8.GetString(buf, off, len));
        }

        private static string Percent(byte[] buf, int off)
        {
            float v = BitConverter.ToSingle(buf, off);
            if (float.IsNaN(v) || float.IsInfinity(v)) v = 0f;
            return Math.Round(v * 100.0).ToString(CultureInfo.InvariantCulture);
        }

        private static string B(byte[] buf, int off)
        {
            return buf[off] != 0 ? "true" : "false";
        }

        private static string F(byte[] buf, int off, string format)
        {
            float v = BitConverter.ToSingle(buf, off);
            if (float.IsNaN(v) || float.IsInfinity(v)) v = 0f;
            return v.ToString(format, CultureInfo.InvariantCulture);
        }

        // Largest of `count` consecutive floats, as a 0..100 percentage. A truck is as
        // damaged as its worst part, which is also how the game's own summary reads.
        private static string WorstPercent(byte[] buf, int off, int count)
        {
            float worst = 0f;
            for (int i = 0; i < count; i++)
            {
                float v = BitConverter.ToSingle(buf, off + i * 4);
                if (!float.IsNaN(v) && !float.IsInfinity(v) && v > worst) worst = v;
            }
            return Math.Round(worst * 100.0).ToString(CultureInfo.InvariantCulture);
        }

        private static string BuildJson(byte[] b)
        {
            int t = OFF_TRUCK_BOOLS;
            StringBuilder sb = new StringBuilder(1400);
            sb.Append("{\"type\":\"tel\",\"sdk\":").Append(B(b, OFF_SDK_ACTIVE));
            sb.Append(",\"paused\":").Append(B(b, OFF_PAUSED));
            sb.Append(",\"rev\":").Append(BitConverter.ToUInt32(b, OFF_PLUGIN_REV));
            sb.Append(",\"game\":").Append(BitConverter.ToUInt32(b, OFF_GAME));
            sb.Append(",\"time\":").Append(BitConverter.ToUInt32(b, OFF_TIME_ABS));
            sb.Append(",\"gears\":").Append(BitConverter.ToUInt32(b, OFF_GEARS));
            sb.Append(",\"retSteps\":").Append(BitConverter.ToUInt32(b, OFF_RETARDER_STEPS));
            sb.Append(",\"retarder\":").Append(BitConverter.ToUInt32(b, OFF_RETARDER_LEVEL));
            sb.Append(",\"gear\":").Append(BitConverter.ToInt32(b, OFF_GEAR_DASHBOARD));
            sb.Append(",\"fuelCap\":").Append(F(b, OFF_FUEL_CAPACITY, "0"));
            sb.Append(",\"speed\":").Append(F(b, OFF_SPEED, "0.0"));
            sb.Append(",\"rpm\":").Append(F(b, OFF_RPM, "0"));
            sb.Append(",\"cruise\":").Append(F(b, OFF_CRUISE_SPEED, "0.0"));
            sb.Append(",\"air\":").Append(F(b, OFF_AIR_PRESSURE, "0"));
            sb.Append(",\"fuel\":").Append(F(b, OFF_FUEL, "0"));
            sb.Append(",\"dmgTruck\":").Append(WorstPercent(b, OFF_WEAR_ENGINE, 5));
            sb.Append(",\"dmgTrailer\":").Append(WorstPercent(b, OFF_TRAILER0_CARGO_DAMAGE + 4, 3));
            sb.Append(",\"dmgCargo\":").Append(WorstPercent(b, OFF_TRAILER0_CARGO_DAMAGE, 1));
            sb.Append(",\"routeDist\":").Append(F(b, OFF_ROUTE_DISTANCE, "0"));
            sb.Append(",\"routeTime\":").Append(F(b, OFF_ROUTE_TIME, "0"));
            // truck_b, in declaration order
            sb.Append(",\"park\":").Append(B(b, t + 0));
            sb.Append(",\"motorBrake\":").Append(B(b, t + 1));
            sb.Append(",\"electric\":").Append(B(b, t + 9));
            sb.Append(",\"engine\":").Append(B(b, t + 10));
            sb.Append(",\"wipers\":").Append(B(b, t + 11));
            sb.Append(",\"blinkL\":").Append(B(b, t + 14));   // lamp currently lit (flashes)
            sb.Append(",\"blinkR\":").Append(B(b, t + 15));
            sb.Append(",\"parking\":").Append(B(b, t + 16));  // parking lights
            sb.Append(",\"low\":").Append(B(b, t + 17));
            sb.Append(",\"high\":").Append(B(b, t + 18));
            sb.Append(",\"beacon\":").Append(B(b, t + 19));
            sb.Append(",\"hazard\":").Append(B(b, t + 22));
            sb.Append(",\"cruiseOn\":").Append(B(b, t + 23));
            sb.Append(",\"diff\":").Append(B(b, t + 42));
            sb.Append(",\"lift\":").Append(B(b, t + 43));
            sb.Append(",\"trailerLift\":").Append(B(b, t + 45));
            sb.Append(",\"trailer\":").Append(B(b, OFF_TRAILER0_ATTACHED));
            // warning lamps as the truck itself decides them
            sb.Append(",\"airWarn\":").Append(B(b, t + 2));
            sb.Append(",\"fuelWarn\":").Append(B(b, t + 4));
            sb.Append(",\"adblueWarn\":").Append(B(b, t + 5));
            sb.Append(",\"oilWarn\":").Append(B(b, t + 6));
            sb.Append(",\"waterWarn\":").Append(B(b, t + 7));
            sb.Append(",\"battWarn\":").Append(B(b, t + 8));
            sb.Append(",\"stalkL\":").Append(B(b, t + 12));   // indicator switched on (steady)
            sb.Append(",\"stalkR\":").Append(B(b, t + 13));
            // on-board computer
            sb.Append(",\"due\":").Append(BitConverter.ToUInt32(b, OFF_DELIVERY_TIME));
            sb.Append(",\"jobKm\":").Append(BitConverter.ToUInt32(b, OFF_PLANNED_KM));
            sb.Append(",\"mass\":").Append(F(b, OFF_CARGO_MASS, "0"));
            sb.Append(",\"income\":").Append(BitConverter.ToUInt64(b, OFF_JOB_INCOME));
            sb.Append(",\"onJob\":").Append(B(b, OFF_ON_JOB));
            sb.Append(",\"brakeT\":").Append(F(b, OFF_BRAKE_TEMP, "0"));
            sb.Append(",\"fuelAvg\":").Append(F(b, OFF_FUEL_AVG, "0.000"));
            sb.Append(",\"range\":").Append(F(b, OFF_FUEL_RANGE, "0"));
            sb.Append(",\"adblue\":").Append(F(b, OFF_ADBLUE, "0"));
            sb.Append(",\"adblueCap\":").Append(F(b, OFF_ADBLUE_CAPACITY, "0"));
            sb.Append(",\"oilP\":").Append(F(b, OFF_OIL_PRESSURE, "0"));
            sb.Append(",\"oilT\":").Append(F(b, OFF_OIL_TEMP, "0"));
            sb.Append(",\"waterT\":").Append(F(b, OFF_WATER_TEMP, "0"));
            sb.Append(",\"batt\":").Append(F(b, OFF_BATTERY, "0.0"));
            sb.Append(",\"odo\":").Append(F(b, OFF_ODOMETER, "0"));
            sb.Append(",\"limit\":").Append(F(b, OFF_SPEED_LIMIT, "0.0"));
            sb.Append(",\"wear\":[").Append(Percent(b, OFF_WEAR_ENGINE)).Append(',').Append(Percent(b, OFF_WEAR_ENGINE + 4)).Append(',')
              .Append(Percent(b, OFF_WEAR_ENGINE + 8)).Append(',').Append(Percent(b, OFF_WEAR_ENGINE + 12)).Append(',').Append(Percent(b, OFF_WEAR_ENGINE + 16)).Append(']');
            sb.Append(",\"truck\":").Append(Str(b, 1)).Append(",\"model\":").Append(Str(b, 3));
            sb.Append(",\"cargo\":").Append(Str(b, 5));
            sb.Append(",\"cityTo\":").Append(Str(b, 7)).Append(",\"compTo\":").Append(Str(b, 9));
            sb.Append(",\"cityFrom\":").Append(Str(b, 11)).Append(",\"compFrom\":").Append(Str(b, 13));
            sb.Append("}");
            return sb.ToString();
        }

        private static void TelemetryLoop()
        {
            byte[] buf = new byte[VIEW_SIZE];
            string last = "";
            string lastMedia = "";
            int sinceEmit = 0;
            int mediaTick = 0;
            while (true)
            {
                TrackForeground();
                // once a second is plenty for a track title
                mediaTick++;
                if (mediaTick >= 10)
                {
                    mediaTick = 0;
                    string media;
                    try { media = MediaJson(); } catch (Exception) { media = MediaLine(false, false, "", ""); }
                    if (media != lastMedia) { Emit(media); lastMedia = media; }
                }
                string json;
                try
                {
                    // Re-opened on every pass on purpose: the mapping only exists while the
                    // game is running, and holding a handle would keep a stale one alive
                    // across game restarts.
                    using (MemoryMappedFile mmf = MemoryMappedFile.OpenExisting(
                               "Local\\SCSTelemetry", MemoryMappedFileRights.Read))
                    using (MemoryMappedViewAccessor view = mmf.CreateViewAccessor(
                               0, VIEW_SIZE, MemoryMappedFileAccess.Read))
                    {
                        view.ReadArray<byte>(0, buf, 0, VIEW_SIZE);
                    }
                    json = BuildJson(buf);
                }
                catch (Exception)
                {
                    // Game closed or telemetry plugin not installed
                    json = "{\"type\":\"tel\",\"sdk\":false}";
                }

                sinceEmit++;
                // Emit on change; also every ~2 s as a heartbeat for clients that just connected
                if (json != last || sinceEmit >= 20)
                {
                    Emit(json);
                    last = json;
                    sinceEmit = 0;
                }
                Thread.Sleep(100);
            }
        }

        // ---- Game controller buttons -------------------------------------------------------
        // The panel steps its cluster screens with the same controller button the player bound to the
        // game's "dashboard display modes". Read through winmm (no driver, no extra install): every
        // joystick/wheel/pad Windows lists is polled, and each button PRESS is reported as
        // {"type":"pad","dev":n,"btn":b} (b counts from 0). Only presses are sent, never a held state.
        [StructLayout(LayoutKind.Sequential)]
        private struct JOYINFOEX
        {
            public uint dwSize; public uint dwFlags;
            public uint dwXpos; public uint dwYpos; public uint dwZpos; public uint dwRpos; public uint dwUpos; public uint dwVpos;
            public uint dwButtons; public uint dwButtonNumber; public uint dwPOV; public uint dwReserved1; public uint dwReserved2;
        }
        [DllImport("winmm.dll")] private static extern int joyGetPosEx(int uJoyID, ref JOYINFOEX pji);

        // Device identity: for USB/HID controllers winmm reports the USB vendor id as wMid and the product id
        // as wPid. The game names its controllers in controls.sii by the same pair (di8 GUID "{PPPPVVVV-...}"),
        // which is how the bridge knows which physical device the "display" binding belongs to.
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct JOYCAPSW
        {
            public ushort wMid; public ushort wPid;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string szPname;
            public uint wXmin, wXmax, wYmin, wYmax, wZmin, wZmax, wNumButtons, wPeriodMin, wPeriodMax;
            public uint wRmin, wRmax, wUmin, wUmax, wVmin, wVmax, wCaps, wMaxAxes, wNumAxes, wMaxButtons;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string szRegKey;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)] public string szOEMVxD;
        }
        [DllImport("winmm.dll", CharSet = CharSet.Unicode)] private static extern int joyGetDevCapsW(IntPtr uJoyID, ref JOYCAPSW pjc, int cbjc);

        private static void PadLoop()
        {
            const uint JOY_RETURNALL = 0xFF;
            uint[] last = new uint[16];
            int[] present = new int[16];
            int[] vid = new int[16], pid = new int[16];
            int tick = 0;
            while (true)
            {
                for (int id = 0; id < 16; id++)
                {
                    // devices that were absent are re-checked only every ~2 s
                    if (present[id] == 0 && tick % 100 != 0) continue;
                    JOYINFOEX ji = new JOYINFOEX();
                    ji.dwSize = (uint)Marshal.SizeOf(typeof(JOYINFOEX));
                    ji.dwFlags = JOY_RETURNALL;
                    int r;
                    try { r = joyGetPosEx(id, ref ji); } catch { return; }   // winmm missing: give up quietly
                    if (r != 0) { present[id] = 0; last[id] = 0; continue; }
                    if (present[id] == 0)
                    {
                        // newly seen device: read its identity once and announce it (the bridge window logs it)
                        JOYCAPSW jc = new JOYCAPSW();
                        string name = "";
                        try
                        {
                            if (joyGetDevCapsW((IntPtr)id, ref jc, Marshal.SizeOf(typeof(JOYCAPSW))) == 0)
                            { vid[id] = jc.wMid; pid[id] = jc.wPid; name = jc.szPname ?? ""; }
                        }
                        catch { }
                        Emit("{\"type\":\"paddev\",\"dev\":" + id + ",\"vid\":" + vid[id] + ",\"pid\":" + pid[id] +
                             ",\"name\":\"" + name.Replace("\\", "").Replace("\"", "") + "\"}");
                        last[id] = ji.dwButtons;   // buttons already held at discovery are not "presses"
                    }
                    present[id] = 1;
                    uint down = ji.dwButtons & ~last[id];
                    last[id] = ji.dwButtons;
                    for (int b = 0; b < 32; b++)
                        if ((down & (1u << b)) != 0)
                            Emit("{\"type\":\"pad\",\"dev\":" + id + ",\"vid\":" + vid[id] + ",\"pid\":" + pid[id] + ",\"btn\":" + b + "}");
                }
                tick++;
                Thread.Sleep(20);
            }
        }

        // ---- Secondary keybinds (physical PC keyboard) --------------------------------------
        // A numpad / second keyboard plugged into the PC should trigger the same panel actions
        // as the tablet, even while the game has focus. GetAsyncKeyState polling (not a global
        // hook) is enough here because the combos are PC-only shortcuts nobody else binds, and
        // it needs no admin rights. Only the rising edge (not-held -> held) is reported, exactly
        // like PadLoop reports button presses and never a held state.
        private const int VK_CONTROL = 0x11;
        private const int VK_SHIFT = 0x10;
        private const int VK_F1 = 0x70;   // F1..F12 are consecutive VK codes
        private const int VK_NUMPAD0 = 0x60; // NUMPAD0..NUMPAD9 are consecutive VK codes

        private static bool IsDown(int vk) { return (GetAsyncKeyState(vk) & 0x8000) != 0; }

        private static void KeyboardLoop()
        {
            // one flag per combo this helper watches: 12 Ctrl+Shift+F-keys + 9 numpad digits
            bool[] lastF = new bool[12];
            bool[] lastNum = new bool[10];
            while (true)
            {
                bool mod = IsDown(VK_CONTROL) && IsDown(VK_SHIFT);
                for (int i = 0; i < 12; i++)
                {
                    bool down = mod && IsDown(VK_F1 + i);
                    if (down && !lastF[i]) Emit("{\"type\":\"hotkey\",\"combo\":\"ctrl+shift+f" + (i + 1) + "\"}");
                    lastF[i] = down;
                }
                for (int i = 1; i <= 9; i++)
                {
                    bool down = IsDown(VK_NUMPAD0 + i);
                    if (down && !lastNum[i]) Emit("{\"type\":\"hotkey\",\"combo\":\"numpad" + i + "\"}");
                    lastNum[i] = down;
                }
                Thread.Sleep(30);
            }
        }

        // ---- Entry point -------------------------------------------------------------------
        public static void Run()
        {
            // Without this, Windows lies about screen size on scaled (125 %, 150 %) displays
            // and the captured region would be offset and blurry.
            SetProcessDPIAware();

            string apps = Environment.GetEnvironmentVariable("TRUCKDECK_CAPTURE_APPS");
            if (!string.IsNullOrEmpty(apps)) captureApps = apps.ToLowerInvariant().Replace(" ", "").Split(',');

            Thread tel = new Thread(TelemetryLoop);
            tel.IsBackground = true; // dies with the stdin loop when Node closes the pipe
            tel.Start();
            Thread pad = new Thread(PadLoop);
            pad.IsBackground = true;
            pad.Start();
            Thread kb = new Thread(KeyboardLoop);
            kb.IsBackground = true;
            kb.Start();

            Emit("{\"type\":\"ready\"}");

            string line;
            while ((line = Console.In.ReadLine()) != null)
            {
                string[] p = line.Trim().Split(' ');
                if (p.Length == 7 && p[0] == "c") { HandleCapture(p); continue; }
                if (p.Length != 3) continue;
                ushort scan;
                if (!ushort.TryParse(p[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out scan)) continue;
                bool ext = p[2] == "1";
                if (p[2] == "2")
                {
                    // virtual key (media / volume): no focus hand-back, Windows handles it globally
                    if (p[0] == "d") VirtualKey(scan, false);
                    else if (p[0] == "u") VirtualKey(scan, true);
                }
                else if (p[0] == "d") { GiveFocusBackToGame(); Key(scan, ext, false); }
                else if (p[0] == "u") Key(scan, ext, true);
            }
        }
    }
}
