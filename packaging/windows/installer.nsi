Unicode true
!include "MUI2.nsh"
Name "Sonix"
OutFile "Sonix-Setup-0.1.1.exe"
InstallDir "$LOCALAPPDATA\Programs\Sonix"
InstallDirRegKey HKCU "Software\Sonix" "InstallDir"
RequestExecutionLevel user
Icon "sonix.ico"
UninstallIcon "sonix.ico"
BrandingText "Sonix 0.1.1 preview"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\Sonix.exe"
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Section "Sonix"
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  File "Sonix.exe"
  File "sonix.ico"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateDirectory "$SMPROGRAMS\Sonix"
  CreateShortcut "$SMPROGRAMS\Sonix\Sonix.lnk" "$INSTDIR\Sonix.exe" "" "$INSTDIR\sonix.ico"
  CreateShortcut "$DESKTOP\Sonix.lnk" "$INSTDIR\Sonix.exe" "" "$INSTDIR\sonix.ico"
  CreateShortcut "$SMPROGRAMS\Sonix\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Sonix" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sonix" "DisplayName" "Sonix"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sonix" "DisplayVersion" "0.1.1"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sonix" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sonix" "DisplayIcon" "$INSTDIR\sonix.ico"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sonix" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sonix" "NoRepair" 1
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  Delete "$DESKTOP\Sonix.lnk"
  Delete "$SMPROGRAMS\Sonix\Sonix.lnk"
  Delete "$SMPROGRAMS\Sonix\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Sonix"
  Delete "$INSTDIR\Sonix.exe"
  Delete "$INSTDIR\sonix.ico"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "Software\Sonix"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sonix"
SectionEnd
