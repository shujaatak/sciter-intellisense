# Sciter IntelliSense

Adds IntelliSense for **Sciter-specific JavaScript, HTML, and CSS** in Visual Studio Code.

### Important Note

IntelliSense works only in **separate `.html`, `.css`, and `.js` files**.
It does **not** apply inside embedded `<script>` or `<style>` tags in a `.html` file.

---

## Quick Start

To enable Sciter IntelliSense in your **HTML**, **CSS**, and **JavaScript** files:

1. Open your **Project Folder** in VS Code
2. Open the **Command Palette**

   * Windows/Linux: **Ctrl + Shift + P**
   * macOS: **Cmd + Shift + P**
3. Run:

   ```
   Sciter: Initialize IntelliSense
   ```

That’s it — IntelliSense is now active in your `.html`, `.css`, and `.js` files.

---

## Detailed Setup

### 1. Open your project root in VS Code

The extension installs its typings inside the folder **you currently have open**.
If you run the commands in the wrong folder, no IntelliSense will be configured.

### 2. Initialize IntelliSense

Open the **Command Palette**:

* Windows/Linux: **Ctrl + Shift + P**
* macOS: **Cmd + Shift + P**

Run:

```
Sciter: Initialize IntelliSense
```

This will:

* Create a `sciter_modules` folder in the project root
* Download all Sciter type definitions (`*.d.ts`)
* Create `jsconfig.json` if missing
* Enable IntelliSense for:

  * Sciter JavaScript APIs (`Element`, `Window`, `Graphics`, events, behaviors…)
  * Sciter-specific CSS properties
  * Sciter HTML tags & attributes

### 3. Update / Repair IntelliSense

To refresh the setup in the **same project root folder**, run:

```
Sciter: Update IntelliSense
```

This deletes the existing `sciter_modules` directory and downloads a clean copy.

---

## Development (for contributors)

```bash
git clone https://github.com/shujaatak/sciter-intellisense
cd sciter-intellisense
npm install
npm run compile
```

Press **F5** in VS Code to launch the Extension Development Host.

---

## Packaging

```bash
npm install -g @vscode/vsce
vsce package
```

Produces a `.vsix` file in the project root.

---

## Publishing

Create a publisher:
[https://marketplace.visualstudio.com/publishers](https://marketplace.visualstudio.com/publishers)

Upload the `.vsix` file
**or publish using CLI:**

```bash
vsce publish
```

---

## Credits

* **[@MustafaHi](https://github.com/MustafaHi)** — original Sciter typings
* **[@patrick](https://sciter.com/forums/topic/typescript/#post-77670)** — Sciter TypeScript guidance