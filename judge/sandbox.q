/ qlab sandbox.q
/ Loaded at the top of every judge run.
/ Restricts dangerous q operations before user code is evaluated.

/ Block system calls (prevents shell injection via system"rm -rf ...")
system:{'"SANDBOX: system calls are not permitted"};

/ Block file I/O writes
/ Read-only access to /problems and /judge is still needed (loaded before sandbox)
/ After this point, file writes are blocked
hsym:{[x]'"SANDBOX: hsym is not permitted in submissions"};

/ Block network operations
.z.pg:{'"SANDBOX: IPC access not permitted"};
.z.ps:{'"SANDBOX: IPC access not permitted"};
.z.ph:{'"SANDBOX: HTTP access not permitted"};
.z.pp:{'"SANDBOX: HTTP POST not permitted"};

/ Block timer abuse
.z.ts:{'"SANDBOX: timer callbacks not permitted"};

/ Prevent exit from being called (judge controls exit)
/ Note: we re-allow exit in the harness for the judge's own use
/ so we only block it during user code execution
/ (harness wraps user eval and restores exit after)

/ Log that sandbox is active
/ -2 "SANDBOX: active";
