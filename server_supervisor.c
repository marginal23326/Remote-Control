#include <windows.h>
#include <stdio.h>
#define PORT "5000"
#define SERVER_PATH "C:\\server\\server.py"
#define PYTHON_PATH "C:\\Users\\Best Computer\\AppData\\Local\\Programs\\Python\\Python313\\python.exe"

int main() {
    char cmd[MAX_PATH * 2];
    STARTUPINFO si = {sizeof(si)};
    PROCESS_INFORMATION pi;
    
    sprintf(cmd, "\"%s\" \"%s\" %s", PYTHON_PATH, SERVER_PATH, PORT);
    
    for(;;) {
        if(!CreateProcess(NULL, cmd, NULL, NULL, FALSE, CREATE_NO_WINDOW | DETACHED_PROCESS, NULL, "C:\\server", &si, &pi)) {
            if(GetLastError() == ERROR_ACCESS_DENIED) {
                char resetCmd[MAX_PATH * 2];
                sprintf(resetCmd, "cmd.exe /C icacls \"%s\" /reset", PYTHON_PATH);
                STARTUPINFO siReset = {sizeof(siReset)};
                PROCESS_INFORMATION piReset;
                if(CreateProcess(NULL, resetCmd, NULL, NULL, FALSE, CREATE_NO_WINDOW, NULL, NULL, &siReset, &piReset)) {
                    WaitForSingleObject(piReset.hProcess, INFINITE);
                    CloseHandle(piReset.hProcess);
                    CloseHandle(piReset.hThread);
                }
                Sleep(1000);
                continue;
            }
        }
        WaitForSingleObject(pi.hProcess, INFINITE);
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
        Sleep(1000);
    }
}