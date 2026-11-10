# Privacy and data handling

JSON Twist processes example inputs locally inside VS Code. The extension does not make network requests, send telemetry, execute application code, or require an account, API key or backend.

Input and generated cases remain in memory while the generator panel is open. Switching editor tabs keeps that session; closing the panel releases it. The extension does not save payload history or use persistent webview state for payloads.

Copy JSON writes the selected payload to the operating-system clipboard at your request. Optional export writes the selected fixtures and explanatory index to a newly created local folder at your request. Clipboard contents, clipboard-history tools and exported files can persist after the panel closes and are controlled by VS Code/your operating system and your own tools.

Selected JavaScript object snippets are parsed as syntax. Literal data is copied; runtime expressions are replaced with empty strings. No eval, dynamic code execution, imports or HTTP requests are used to resolve them.

Do not include credentials, tokens or real customer records in public bug reports. Use a small synthetic example. VS Code itself and any other installed extensions have their own data-handling policies; this document describes JSON Twist only.
