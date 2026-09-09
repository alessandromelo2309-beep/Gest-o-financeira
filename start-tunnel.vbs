Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\55949\OneDrive\Documentos\Default Project"
WshShell.Run "cmd /c lt --port 3001 > tunnel-output.txt 2>&1", 0, False
