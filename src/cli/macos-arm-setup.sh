#!/bin/bash

echo "Checking if you have Rosetta 2 installed..."
if ! /usr/bin/pgrep oahd >/dev/null 2>&1; then
    echo "Rosetta 2 is not installed. Installing..."
    /usr/sbin/softwareupdate --install-rosetta --agree-to-license
else
    echo "Rosetta 2 is already installed."
fi

echo "Checking if Homebrew is installed under Rosetta..."
if ! arch -x86_64 /usr/local/bin/brew -v >/dev/null 2>&1; then
    echo "Homebrew is not installed for x86_64. Installing..."
    arch -x86_64 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "Homebrew is already installed under Rosetta."
fi

echo "Installing Node.js and nvm using Homebrew..."
arch -x86_64 /usr/local/bin/brew install nvm

echo "Setting up NVM and Node.js..."
export NVM_DIR="$HOME/.nvm"
[ -s "/usr/local/opt/nvm/nvm.sh" ] && \. "/usr/local/opt/nvm/nvm.sh"  # This loads nvm
[ -s "/usr/local/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/usr/local/opt/nvm/etc/bash_completion.d/nvm"  # This loads nvm bash_completion

echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bash_profile
echo '[ -s "/usr/local/opt/nvm/nvm.sh" ] && \. "/usr/local/opt/nvm/nvm.sh"' >> ~/.bash_profile
echo '[ -s "/usr/local/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/usr/local/opt/nvm/etc/bash_completion.d/nvm"' >> ~/.bash_profile

nvm install --lts
nvm use --lts

echo "Installing ts-node globally..."
npm install -g ts-node

echo "Setup complete. Please restart your terminal or run 'source ~/.bash_profile' to apply changes."
