package com.hunters.trucksimbuttonbox;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/**
 * The whole app: one full-screen WebView.
 *
 * The button panel itself is served by the bridge program on the player's PC, so this shell
 * only has to (1) find or ask for that PC's address and PIN, (2) open the panel from it, and
 * (3) behave like a mounted instrument: stay awake, hide the system bars, survive rotation.
 * Keeping the panel on the PC means panel updates never wait for a store release.
 */
public class MainActivity extends Activity {

    private static final String CONNECT_PAGE = "file:///android_asset/connect.html";
    private static final String SPLASH_PAGE = "file:///android_asset/splash.html";
    private static final long SPLASH_MS = 4500;   // CSS logo-enter + loader settle, ~4.5s
    private static final int BRIDGE_PORT = 8765;
    // What the bridge answers on /api/info; used to tell it apart from any other web server.
    private static final String BRIDGE_MARK = "truckdeck";
    // host or host:port, nothing else: this string ends up inside a URL we load
    private static final Pattern HOST = Pattern.compile("^[A-Za-z0-9.\\-]{1,253}(:[0-9]{1,5})?$");
    private static final Pattern PIN = Pattern.compile("^[0-9]{4}$");

    private WebView web;
    private SharedPreferences prefs;
    private boolean onConnectPage = true;
    // Authority (host:port) of the PC we are showing, to keep navigation from leaving it.
    private String bridgeAuthority = "";

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("bridge", MODE_PRIVATE);

        // A button box that dims mid-drive is useless; the web page cannot ask for this
        // itself because the wake-lock API needs HTTPS, which a LAN address does not have.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(14, 16, 18));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // the panel keeps layouts in localStorage
        s.setSupportZoom(false);               // a double tap must press twice, not zoom
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(true);            // for the bundled connect page only
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new AppBridge(), "HuntersApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Only two places exist for this app: its own connect page and the chosen PC.
                Uri uri = request.getUrl();
                if ("file".equals(uri.getScheme())) return false;
                String authority = uri.getAuthority();
                return authority == null || !authority.equals(bridgeAuthority);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                // PC off, bridge closed, or tablet on another network: back to the connect
                // page with a reason instead of the browser's own error screen.
                if (request.isForMainFrame() && !onConnectPage) showConnect("unreachable");
            }
        });

        // Opening animation first (bundled page, SPLASH_MS), then the real start.
        // onConnectPage stays true meanwhile, so nothing treats the splash as a failed panel.
        web.loadUrl(SPLASH_PAGE);
        web.postDelayed(this::start, SPLASH_MS);
    }

    /** Reconnect to the last PC if there is one, otherwise ask for it. */
    private void start() {
        if (isFinishing() || isDestroyed()) return;
        String host = prefs.getString("host", "");
        String pin = prefs.getString("pin", "");
        if (HOST.matcher(host).matches() && PIN.matcher(pin).matches()) openPanel(host, pin);
        else showConnect("");
    }

    private void showConnect(String reason) {
        onConnectPage = true;
        bridgeAuthority = "";
        web.loadUrl(CONNECT_PAGE + (reason.isEmpty() ? "" : "?reason=" + reason));
    }

    private void openPanel(String host, String pin) {
        onConnectPage = false;
        bridgeAuthority = host.contains(":") ? host : host + ":" + BRIDGE_PORT;
        // The panel reads the PIN from the address once, stores it and cleans the address.
        web.loadUrl("http://" + bridgeAuthority + "/?pin=" + pin);
    }

    // ---- Immersive full screen ------------------------------------------------------------
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    @SuppressWarnings("deprecation")
    private void hideSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.hide(WindowInsets.Type.systemBars());
                // bars slide in on a swipe from the edge and leave again by themselves
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        // On the panel, Back is far too easy to hit by accident mid-drive: it does nothing.
        // Leaving the PC is done from the panel menu ("Connect to another PC").
        if (onConnectPage) super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }

    // ---- Finding the PC on the network ----------------------------------------------------
    /** Network prefixes ("192.168.1.") of every private IPv4 address this device has. */
    private static List<String> localPrefixes() {
        List<String> out = new ArrayList<>();
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress a : Collections.list(ni.getInetAddresses())) {
                    if (!(a instanceof Inet4Address) || !a.isSiteLocalAddress()) continue;
                    String ip = a.getHostAddress();
                    String prefix = ip.substring(0, ip.lastIndexOf('.') + 1);
                    if (!out.contains(prefix)) out.add(prefix);
                }
            }
        } catch (Exception ignored) {
            // no interfaces readable: the scan simply finds nothing
        }
        return out;
    }

    /** True when http://ip:8765/api/info answers like the bridge. */
    private static boolean isBridge(String ip) {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL("http://" + ip + ":" + BRIDGE_PORT + "/api/info").openConnection();
            // short timeouts: 254 addresses are tried, almost all of them empty
            c.setConnectTimeout(700);
            c.setReadTimeout(700);
            if (c.getResponseCode() != 200) return false;
            InputStream in = c.getInputStream();
            byte[] buf = new byte[256];
            int n = in.read(buf);
            in.close();
            return n > 0 && new String(buf, 0, n, "UTF-8").contains(BRIDGE_MARK);
        } catch (Exception e) {
            return false;
        } finally {
            if (c != null) c.disconnect();
        }
    }

    private void startScan() {
        final List<String> prefixes = localPrefixes();
        new Thread(() -> {
            final List<String> found = Collections.synchronizedList(new ArrayList<String>());
            // Home networks are almost always a /24, so trying the 254 neighbours of our own
            // address finds the PC without the player ever opening a command prompt.
            ExecutorService pool = Executors.newFixedThreadPool(48);
            for (String prefix : prefixes) {
                for (int i = 1; i <= 254; i++) {
                    final String ip = prefix + i;
                    pool.execute(() -> { if (isBridge(ip)) found.add(ip); });
                }
            }
            pool.shutdown();
            try { pool.awaitTermination(12, TimeUnit.SECONDS); } catch (InterruptedException ignored) { }
            pool.shutdownNow();
            final String json = new org.json.JSONArray(found).toString();
            runOnUiThread(() -> { if (onConnectPage) web.evaluateJavascript("onScanDone(" + json + ")", null); });
        }).start();
    }

    // ---- What the pages may ask the app to do ---------------------------------------------
    // Exposed to the connect page and to the panel served by the PC. Every method is
    // harmless by itself and validates what it is given; nothing here reads files or runs code.
    private class AppBridge {
        @JavascriptInterface
        public String saved() {
            try {
                return new JSONObject()
                        .put("host", prefs.getString("host", ""))
                        .put("pin", prefs.getString("pin", ""))
                        .toString();
            } catch (Exception e) {
                return "{}";
            }
        }

        @JavascriptInterface
        public boolean connect(String host, String pin) {
            final String h = host == null ? "" : host.trim();
            final String p = pin == null ? "" : pin.trim();
            if (!HOST.matcher(h).matches() || !PIN.matcher(p).matches()) return false;
            prefs.edit().putString("host", h).putString("pin", p).apply();
            runOnUiThread(() -> openPanel(h, p));
            return true;
        }

        @JavascriptInterface
        public void scan() {
            if (!onConnectPage) return; // only the connect page may probe the network
            startScan();
        }

        @JavascriptInterface
        public void changePc() {
            runOnUiThread(() -> showConnect(""));
        }
    }
}
