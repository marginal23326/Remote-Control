#include <windows.h>
#include <stdio.h>

#define PORT "5000"
#define SERVER_PATH "C:\\server\\server.py"
#define PYTHON_PATH "C:\\Users\\Best Computer\\AppData\\Local\\Programs\\Python\\Python313\\python.exe"
#define MAX_CMD_LENGTH 2048

void resetPermissions(const char* pythonPath) {
    char cmd[MAX_CMD_LENGTH];
    STARTUPINFO si = {sizeof(si)};
    PROCESS_INFORMATION pi;
    const char* commands[] = {
        "takeown /F \"%s\" /A",
        "icacls \"%s\" /reset",
        "icacls \"%s\" /grant:r \"Admin\":(F)",
        "icacls \"%s\" /grant:r \"SYSTEM\":(F)",
        "icacls \"%s\" /grant:r \"Administrators\":(F)"
    };
    
    for(int i = 0; i < sizeof(commands)/sizeof(commands[0]); i++) {
        sprintf(cmd, "cmd.exe /C ");
        char tempCmd[MAX_CMD_LENGTH];
        sprintf(tempCmd, commands[i], pythonPath);
        strcat(cmd, tempCmd);
        
        if(CreateProcess(NULL, cmd, NULL, NULL, FALSE, CREATE_NO_WINDOW, 
                        NULL, NULL, &si, &pi)) {
            WaitForSingleObject(pi.hProcess, INFINITE);
            CloseHandle(pi.hProcess);
            CloseHandle(pi.hThread);
            Sleep(200);
        }
    }
}

int main() {
    char cmd[MAX_CMD_LENGTH];
    STARTUPINFO si = {sizeof(si)};
    PROCESS_INFORMATION pi;
    DWORD lastError;
    int retryCount = 0;
    const int MAX_RETRIES = 3;
    
    sprintf(cmd, "\"%s\" \"%s\" %s", PYTHON_PATH, SERVER_PATH, PORT);
    
    for(;;) {
        if(!CreateProcess(NULL, cmd, NULL, NULL, FALSE, 
                         CREATE_NO_WINDOW | DETACHED_PROCESS, 
                         NULL, "C:\\server", &si, &pi)) {
            lastError = GetLastError();
            if(lastError == ERROR_ACCESS_DENIED) {
                resetPermissions(PYTHON_PATH);
                
                retryCount++;
                if(retryCount >= MAX_RETRIES) {
                    Sleep(5000);
                    retryCount = 0;
                } else {
                    Sleep(1000);
                }
                continue;
            } else {
                Sleep(5000);
                continue;
            }
        }
        
        retryCount = 0;
        
        WaitForSingleObject(pi.hProcess, INFINITE);
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
        Sleep(1000);
    }
}