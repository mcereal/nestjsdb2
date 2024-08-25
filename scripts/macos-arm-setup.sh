#!/bin/bash

# Function to log messages with timestamp
log_message() {
    local message="$1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $message"
}

# Function to handle errors
handle_error() {
    local exit_code="$1"
    local message="$2"
    if [ "$exit_code" -ne 0 ]; then
        log_message "ERROR: $message"
        exit "$exit_code"
    fi
}

log_message "Checking if you have Rosetta 2 installed..."
if ! /usr/bin/pgrep oahd >/dev/null 2>&1; then
    log_message "Rosetta 2 is not installed. Installing..."
    /usr/sbin/softwareupdate --install-rosetta --agree-to-license
    handle_error $? "Failed to install Rosetta 2."
else
    log_message "Rosetta 2 is already installed."
fi

log_message "Checking if Homebrew is installed under Rosetta..."
if ! arch -x86_64 /usr/local/bin/brew -v >/dev/null 2>&1; then
    log_message "Homebrew is not installed for x86_64. Installing..."
    arch -x86_64 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    handle_error $? "Failed to install Homebrew for x86_64."
else
    log_message "Homebrew is already installed under Rosetta."
fi

log_message "Installing Node.js and nvm using Homebrew under Rosetta..."
arch -x86_64 /usr/local/bin/brew install nvm
handle_error $? "Failed to install nvm using Homebrew."

log_message "Setting up NVM and Node.js..."
export NVM_DIR="$HOME/.nvm"
mkdir -p "$NVM_DIR"

{
    echo "export NVM_DIR=\"\$HOME/.nvm\""
    echo '[ -s "/usr/local/opt/nvm/nvm.sh" ] && \. "/usr/local/opt/nvm/nvm.sh"'
    echo '[ -s "/usr/local/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/usr/local/opt/nvm/etc/bash_completion.d/nvm"'
} >> ~/.bash_profile

# Load NVM environment
NVM_SH="/usr/local/opt/nvm/nvm.sh"
NVM_BASH_COMPLETION="/usr/local/opt/nvm/etc/bash_completion.d/nvm"

# Source nvm and bash completion scripts within the Rosetta environment
if [ -s "$NVM_SH" ]; then
    log_message "Sourcing NVM..."
    arch -x86_64 bash -c ". $NVM_SH && . $NVM_BASH_COMPLETION && nvm install --lts && nvm use --lts"
    handle_error $? "Failed to install or use the latest LTS version of Node.js using nvm."
else
    log_message "ERROR: NVM script not found at $NVM_SH"
    exit 1
fi

log_message "Installing ts-node globally under Rosetta..."
arch -x86_64 npm install -g ts-node
handle_error $? "Failed to install ts-node globally."

log_message "Setup complete. Please restart your terminal or run 'source ~/.bash_profile' to apply changes."
