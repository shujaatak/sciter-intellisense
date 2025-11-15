# Sciter IntelliSense

Adds IntelliSense for **Sciter-specific JavaScript, HTML, and CSS** in Visual Studio Code.
Automatically downloads and manages Sciter’s `.d.ts` files for accurate auto-completion, hover info, and CSS suggestions.

---

## Quick Start

### 1. Install the extension

Available on the VS Code Marketplace.

### 2. Initialize IntelliSense

Open the **Command Palette**:

* Windows/Linux: **Ctrl + Shift + P**
* macOS: **Cmd + Shift + P**

Run:

```
Sciter: Initialize IntelliSense
```

This will:

* Create a `sciter_modules` folder in your workspace
* Download all Sciter type definitions (`*.d.ts`)
* Add `jsconfig.json` if missing
* Enable IntelliSense for:

  * `Element`, `Window`, `Graphics`, `Event`, `Document`, behaviors…
  * Sciter CSS properties
  * Sciter DOM and window APIs

### 3. Update / Repair IntelliSense

At any time, open the Command Palette and run:

```
Sciter: Update IntelliSense
```

This resets the setup by deleting the old `sciter_modules` folder and downloading a fresh copy.

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

Then upload the packaged `.vsix`
or publish using:

```bash
vsce publish
```

---

## Credits

* **[@MustafaHi](https://github.com/MustafaHi)** — original Sciter typings
* **[@patrick](https://sciter.com/forums/topic/typescript/#post-77670)** — TypeScript support insights