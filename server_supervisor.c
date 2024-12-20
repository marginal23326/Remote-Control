#include <windows.h>
#include <stdio.h>

#define PORT "5000"
#define SERVER_PATH "C:\\server\\server.py"

int main() {
    char cmd[MAX_PATH * 2];
    STARTUPINFO si = {sizeof(si)};
    PROCESS_INFORMATION pi;
    
    sprintf(cmd, "python.exe \"%s\" %s", SERVER_PATH, PORT);
    
    for(;;) {
        if(CreateProcess(0, cmd, 0, 0, 0, CREATE_NO_WINDOW | DETACHED_PROCESS, 0, 0, &si, &pi)) {
            WaitForSingleObject(pi.hProcess, INFINITE);
            CloseHandle(pi.hProcess);
            CloseHandle(pi.hThread);
        }
        Sleep(1000);
    }
}