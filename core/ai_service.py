import threading
import json
import os
from functools import partial
from dotenv import load_dotenv, find_dotenv

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder, PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import AgentExecutor, create_react_agent
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langchain.tools import StructuredTool
from langchain_core.tools import Tool  # Import the base Tool class
from langchain.tools.render import render_text_description  # Import to render tool's description
from pydantic import BaseModel, Field

# --- Output parser for tool calling (for models that support it) ---
from langchain.output_parsers import PydanticToolsParser
from langchain_core.prompts import (
    ChatPromptTemplate,
    MessagesPlaceholder,
)

from langchain_core.agents import AgentAction, AgentFinish # Import AgentAction and AgentFinish


class Action(BaseModel):
    name: str = Field(..., description="The name of the tool to use.")
    arguments: str = Field(..., description="The arguments to the tool in a JSON string.")


class AIService:
    def __init__(
        self,
        socketio,
        file_manager,
        input_manager,
        shell_manager,
        stream_manager,
        task_manager,
    ):
        self.socketio = socketio
        self.file_manager = file_manager
        self.input_manager = input_manager
        self.shell_manager = shell_manager
        self.stream_manager = stream_manager
        self.task_manager = task_manager
        self.running = False
        self.thread = None
        self._load_api_key()
        self.model = self._initialize_model()
        self.tools = self._create_tools()
        self.agent_executor = self._create_agent_executor()

    def _load_api_key(self):
        load_dotenv(find_dotenv())
        self.api_key = "AIzaSyBNK-NgH0sDGwCkMPsOLZHIT6ZXnNLFZXA"

    def _initialize_model(self):
        return ChatGoogleGenerativeAI(
            model="gemini-2.0-flash-exp",
            google_api_key=self.api_key,
            convert_system_message_to_human=True,
        )

    def _create_tools(self):
        tools = []

        # --- Screenshot Tool ---
        def get_screenshot_and_encode():
            try:
                image_str = self.stream_manager.get_screenshot()
                if image_str:
                    return image_str
                else:
                    return "Error: Could not capture screenshot."
            except Exception as e:
                return f"Error capturing screenshot: {e}"

        # Use Tool.from_function to create a LangChain Tool
        tools.append(
            Tool.from_function(
                name="Screenshot",
                func=get_screenshot_and_encode,
                description="Takes a screenshot of the current screen.",
            )
        )

        # --- File Manager Tools ---
        def list_files(path: str) -> str:
            try:
                contents = self.file_manager.get_directory_contents(path)
                return json.dumps(contents)
            except Exception as e:
                return f"Error listing files: {e}"

        tools.append(
            Tool.from_function(
                func=list_files,
                name="ListFiles",
                description="List files in a directory.",
            )
        )

        def download_files(paths: list[str]) -> str:  # Corrected type hint
            if not paths:
                return "Error: No file paths provided for download."
            try:
                with self.file_manager.prepare_download(paths) as (
                    file_path,
                    filename,
                ):
                    return "File(s) ready for download"  # Return success
            except Exception as e:
                return f"Download failed: {str(e)}"

        tools.append(
            Tool.from_function(
                func=download_files,
                name="DownloadFiles",
                description="Download files given their paths.",
            )
        )

        def delete_files_and_folders(paths: list[str]) -> str:  # Corrected type hint
            if not paths or not isinstance(paths, list): # Added input validation
                return "Error: No paths provided for deletion."
            try:
                results = self.file_manager.delete_items(paths)
                return json.dumps(results)
            except Exception as e:
                return f"Deletion failed: {str(e)}"

        tools.append(
            Tool.from_function(
                func=delete_files_and_folders,
                name="DeleteFiles",
                description="Delete specified files or folders.",
            )
        )

        # --- Shell Manager Tools ---
        def execute_command(session_id: str, command: str) -> str:
            try:
                self.shell_manager.write_to_shell(session_id, command)
                # Give it a bit time to process
                output = self.shell_manager.read_output(session_id) or "No output yet."
                return output
            except Exception as e:
                return f"Command execution failed: {str(e)}"

        tools.append(
            Tool.from_function(
                func=execute_command,
                name="ExecuteCommand",
                description="Executes a shell command.",
            )
        )

        # --- Task Manager Tools ---
        def get_processes() -> str:
            try:
                processes = self.task_manager.get_processes()
                return json.dumps(processes)
            except Exception as e:
                return f"Error getting processes: {e}"

        tools.append(
            Tool.from_function(
                func=get_processes,
                name="GetProcesses",
                description="Gets the list of running processes.",
            )
        )

        def kill_process(pid: int) -> str:
            try:
                result = self.task_manager.kill_process(pid)
                return "Success" if result else "Failed to kill process."
            except Exception as e:
                return f"Error killing process: {e}"

        tools.append(
            Tool.from_function(
                func=kill_process,
                name="KillProcess",
                description="Kills a process by PID.",
            )
        )

        # --- Input Manager ---
        def type_text(text: str) -> str:
            try:
                success = (
                    self.input_manager.type_text(text)
                    if len(text) <= 1
                    else self.input_manager.paste_text(text)
                )
                return "Success" if success else "Failed to type text."
            except Exception as e:
                return f"Error in text input: {e}"

        tools.append(
            Tool.from_function(
                func=type_text,
                name="TypeText",
                description="Types text using the keyboard.",
            )
        )

        def handle_shortcut(shortcut: str) -> str:
            try:
                success = self.input_manager.handle_keyboard_shortcut(shortcut)
                return "Success" if success else "Failed to execute shortcut."
            except Exception as e:
                return f"Error in shortcut: {e}"

        tools.append(
            Tool.from_function(
                func=handle_shortcut,
                name="KeyboardShortcut",
                description="Executes a keyboard shortcut.",
            )
        )

        # --- Stream Manager Tools ---
        def start_stream() -> str:
            self.socketio.emit("start_server_stream")  # This should interact with stream_manager
            return "Stream started"

        tools.append(
            Tool.from_function(
                func=start_stream,
                name="StartStream",
                description="Starts the video stream.",
            )
        )

        def stop_stream() -> str:
            self.socketio.emit("stop_server_stream")  # This should interact with stream_manager
            return "Stream stopped"

        tools.append(
            Tool.from_function(
                func=stop_stream,
                name="StopStream",
                description="Stops the video stream.",
            )
        )

        return tools
    
    def _format_intermediate_steps(
        self, intermediate_steps: list[tuple[AgentAction, str]]
    ) -> list[AIMessage]:
        """Format intermediate steps.
        This is necessary because the agent is using a model that expects
        tool_calls in a specific format.

        Args:
            intermediate_steps: Steps the agent has taken, along with observations from those steps

        Returns:
            list of messages to pass to the model.
        """
        messages = []
        for action, observation in intermediate_steps:
            if not isinstance(action, AgentAction):
                raise TypeError(
                    f"Expected 'AgentAction', got {type(action)}."
                    "This is likely due to a bug in the OutputParser. "
                    "Please report."
                )
            # Check if name is a string, and arguments is a dict
            if not isinstance(action.tool, str):
                raise TypeError(
                    "Expected 'action.tool' to be a string. "
                    f"Got {type(action.tool)}."
                )
            if not isinstance(action.tool_input, dict):
                raise TypeError(
                    "Expected 'action.tool_input' to be a dict. "
                    f"Got {type(action.tool_input)}. "
                    "This is likely due to a bug in the OutputParser. "
                    "Please report."
                )
            
            # Create tool_call dict as expected by the model.
            tool_call = {
                "name": action.tool,  # Get tool name directly
                "arguments": json.dumps(action.tool_input),  # Get arguments directly
            }

            messages.append(
                AIMessage(
                    content="",  # Content is empty, as it's a tool call
                    additional_kwargs={"tool_calls": [tool_call]},  # Use tool_calls
                )
            )
            # ToolMessage content is the observation
            messages.append(
                ToolMessage(
                    content=observation,
                    tool_call_id=tool_call["name"]  # Use a consistent tool_call_id
                )
            )
        return messages

    def _create_agent_executor(self):
        system_message = (
            "You are a powerful AI assistant that controls a computer. "
            "You are controlling a Windows 11 computer. "
            "You can issue shell commands, interact with files, control input devices (mouse, keyboard), manage tasks (processes), etc."
            "If you're uncertain, return an error."
            "ALWAYS use tools, ALWAYS return one action and only one action."
        )

        # Create a string of tool names, comma-separated.  This is needed for the ReAct prompt.
        tool_names = ", ".join([tool.name for tool in self.tools])

        # Construct the ReAct prompt.  The order here is VERY important.
        react_prompt = (
            "Use the following format:\n\n"  # Instructions MUST come before tool descriptions
            "Question: the input question you must answer\n"
            "Thought: you should always think about what to do\n"
            f"Action: the action to take, should be one of [{tool_names}]\n"  # tool_names here!
            "Action Input: the input to the action\n"
            "Observation: the result of the action\n"
            "... (this Thought/Action/Action Input/Observation can repeat N times)\n"
            "Thought: I now know the final answer\n"
            "Final Answer: the final answer to the original input question\n\n"
            "TOOLS:\n"
            "------\n"
            f"{render_text_description(self.tools)}\n" # Tool descriptions after the format instructions.
            "You have access to the following tools:\n"
            "{tools}\n" # This {tools} is used by create_react_agent
            "To use a tool, respond with the name and input in the following format:\n"
            "```json\n"
            "{\"name\": \"tool_name\",\n\"arguments\": {\"arg_name\": \"value\"}}\n"
            "```"

        )


        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system_message + "\n\n" + react_prompt), # Combine system message + ReAct
                ("user", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ]
        )

        # KEY CHANGE:  We need to tell the PromptTemplate about 'tool_names'
        prompt = prompt.partial(tool_names=tool_names)

        # Use the correct output parser for tool calling with Google models.
        output_parser = PydanticToolsParser(tools=[Action])

        # Use create_react_agent, and pass in the tools correctly
        agent = create_react_agent(llm=self.model, tools=self.tools, prompt=prompt)

        # Use AgentExecutor, and pass in the output parser
        return AgentExecutor(agent=agent, tools=self.tools, verbose=False, handle_parsing_errors=True, return_intermediate_steps=True) # Added return_intermediate_steps


    def _run_ai(self, initial_prompt: str):
      try:
            # Use a dictionary for invoke, and remove intermediate_steps
            result = self.agent_executor.invoke({"input": initial_prompt})
            self.socketio.emit("ai_feedback", {"feedback": result["output"]})


      except Exception as e:
          self.socketio.emit("ai_feedback", {"feedback": f"AI Error: {e}"})

      while self.running:
          try:
                with open("ai_prompt.txt", "r") as f:
                    prompt = f.read().strip()
                if prompt:
                    self.socketio.emit(
                        "ai_feedback", {"feedback": f"Processing: {prompt}"}
                    )
                    with open("ai_prompt.txt", "w") as f:  # Clear the file immediately.
                        f.write("")
                    # Pass intermediate steps
                    result = self.agent_executor.invoke({"input": prompt}) # Remove intermediate_steps
                    self.socketio.emit("ai_feedback", {"feedback": result["output"]})
          except FileNotFoundError:
              pass  # It's okay if the file doesn't exist yet
          except Exception as e:
              self.socketio.emit("ai_feedback", {"feedback": f"AI Error: {e}"})

          import time
          time.sleep(1)  # A short delay

    def start(self, initial_prompt: str):
        if not self.running:
            self.running = True
            self.thread = threading.Thread(
                target=self._run_ai, args=(initial_prompt,), daemon=True
            )
            self.thread.start()
            self.socketio.emit("ai_feedback", {"feedback": "AI service started."})

    def stop(self):
        if self.running:
            self.running = False
            if self.thread:
                self.thread.join()  # Wait for the thread to finish.
            self.socketio.emit("ai_feedback", {"feedback": "AI service stopped."})