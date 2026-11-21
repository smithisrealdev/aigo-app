# Reacticx components

Copied from [Reacticx](https://github.com/rit3zh/reacticx) (MIT, see `LICENSE`), the way Reacticx is meant to be used: the code lives in the app.

- `energy-orb`: the planning orb on AiGo's work screen. Changed for AiGo: the shader blends normally so it shows on the light theme (the original adds light and turns white on a light background), it no longer fades out between pulses, colour arms turn round the centre, time follows real frame time (same speed at 60 and 120 Hz), and `active` pauses it.
- `number-flow`: the rolling day number on the work screen. Changed for AiGo: `fontFamily`, and shared values use `.get()`/`.set()` (React Compiler).
