Unicode true
!include "MUI2.nsh"

Name "TruckDeck Bridge Setup"
OutFile "TruckDeckBridge-Setup.exe"
InstallDir "$LOCALAPPDATA\\TruckDeck"
InstallDirRegKey HKCU "Software\\TruckDeckBridge" "InstallLocation"
RequestExecutionLevel user
SetCompressor /SOLID lzma
ShowInstDetails show
ShowUninstDetails show

!define UNINSTALL_KEY "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\TruckDeckBridge"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "PortugueseBR"
!insertmacro MUI_LANGUAGE "English"

Section "TruckDeck Bridge" SecMain
  SetOutPath "$INSTDIR"
  File "..\\dist\\TruckDeckBridge.exe"
  SetOutPath "$INSTDIR\\public"
  File /r "..\\dist\\public\\*"
  SetOutPath "$INSTDIR"
  File "..\\dist\\input-helper.ps1"
  File "..\\dist\\InputHelper.cs"
  File "..\\dist\\Start TruckDeck Bridge.bat"

  WriteUninstaller "$INSTDIR\\Uninstall.exe"

  CreateDirectory "$SMPROGRAMS"
  CreateShortCut "$SMPROGRAMS\\TruckDeck Bridge.lnk" "$INSTDIR\\Start TruckDeck Bridge.bat"

  WriteRegStr HKCU "Software\\TruckDeckBridge" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "TruckDeck Bridge"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "1.0.0"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "Publisher" "TruckDeck"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '"$INSTDIR\\Uninstall.exe"'
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\\TruckDeckBridge.exe"
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
SectionEnd

Section /o "Atalho na Area de Trabalho" SecDesktop
  CreateShortCut "$DESKTOP\\TruckDeck Bridge.lnk" "$INSTDIR\\Start TruckDeck Bridge.bat"
SectionEnd

Section "Uninstall"
  Delete "$SMPROGRAMS\\TruckDeck Bridge.lnk"
  Delete "$DESKTOP\\TruckDeck Bridge.lnk"
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
  DeleteRegKey HKCU "Software\\TruckDeckBridge"
  RMDir /r "$INSTDIR\\public"
  Delete "$INSTDIR\\TruckDeckBridge.exe"
  Delete "$INSTDIR\\Uninstall.exe"
  Delete "$INSTDIR\\input-helper.ps1"
  Delete "$INSTDIR\\InputHelper.cs"
  Delete "$INSTDIR\\Start TruckDeck Bridge.bat"
  ; data/ nunca e apagado no uninstall de proposito.
  RMDir "$INSTDIR"
SectionEnd
