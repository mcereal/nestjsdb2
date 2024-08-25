# Rosetta 2 Setup for macOS ARM64

## Why Rosetta 2 is Needed

If you're using a Mac with an ARM64 (Apple Silicon) processor, you might encounter compatibility issues with software that is built for Intel x86_64 architecture. Rosetta 2 is an emulation layer provided by Apple that allows x86_64 applications to run on ARM64 Macs by translating the instructions for compatibility.

In our project, certain components like the IBM DB2 CLI driver may require x86_64 architecture to function properly. This is why Rosetta 2 is necessary to ensure compatibility when running these components on macOS ARM64.

## What Needs to Be Installed

1. **Rosetta 2**: This is required to run x86_64 binaries on ARM64 Macs.
2. **Homebrew (x86_64 version)**: Homebrew, the popular package manager, will be installed in the x86_64 environment to manage other dependencies.
3. **Node.js and NVM (x86_64 version)**: Node.js, managed through NVM (Node Version Manager), needs to be installed in the x86_64 environment to ensure compatibility with the scripts that rely on x86_64 binaries.
4. **ts-node**: This allows for running TypeScript files directly, and it needs to be installed globally in the x86_64 Node.js environment.

## Automation with the Setup Script

We have provided a `macos-arm-setup.sh` script to automate the installation and configuration process for the required components:

1. **Checks and installs Rosetta 2** if it is not already installed.
2. **Installs Homebrew** under the Rosetta (x86_64) environment.
3. **Uses Homebrew** to install `nvm` (Node Version Manager).
4. **Sets up NVM** and installs the latest LTS version of Node.js using NVM, ensuring that it runs under Rosetta.
5. **Installs `ts-node` globally** using the x86_64 version of Node.js.

### Running the Setup Script

To run the setup script manually, execute the following command in your terminal:

```bash
sh ./macos-arm-setup.sh
```

## Additional Information

- Make sure to run the script from the root directory of your project directory.
- After running the script you may need to restart your terminal or source your shell profile to apply the changes.

For more detailed information on Rosetta 2 and its use, you can refer to the official Apple documentation: [Rosetta 2 Overview](https://developer.apple.com/documentation/apple_silicon/about_the_rosetta_translation_environment).
