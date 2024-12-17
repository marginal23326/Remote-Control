#include <windows.h>
#include <stdio.h>

#define PORT "5000"

int main() {
    char path[MAX_PATH], cmd[MAX_PATH * 2];
    STARTUPINFO si = {sizeof(si)};
    PROCESS_INFORMATION pi;
    
    GetModuleFileName(0, path, MAX_PATH);
    *strrchr(path, '\\') = 0;
    sprintf(cmd, "python.exe \"%s\\server.py\" %s", path, PORT);
    
    for(;;) {
        if(CreateProcess(0, cmd, 0, 0, 0, CREATE_NO_WINDOW | DETACHED_PROCESS, 0, path, &si, &pi)) {
            WaitForSingleObject(pi.hProcess, INFINITE);
            CloseHandle(pi.hProcess);
            CloseHandle(pi.hThread);
        }
        Sleep(1000);
    }
}