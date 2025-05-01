#!/bin/bash

# Auto Java Installer Script
# Usage: ./install_java.sh <java_version>

set -e

JAVA_VERSION=$1

if [ -z "$JAVA_VERSION" ]; then
  echo "Usage: $0 <java_version>"
  exit 1
fi

# Detect OS
OS="$(uname -o 2>/dev/null || uname -s)"
case "$OS" in
  Android*) machine="Termux" ;;
  Linux*) machine="Linux" ;;
  *Linux) machine="Linux" ;;
  *Linux*) machine="Linux" ;;
  Darwin*) machine="Mac" ;;
  *) machine="UNKNOWN" ;;
esac

echo "Detected OS: $machine"
echo "Requested Java Version: $JAVA_VERSION"

if [ "$machine" = "UNKNOWN" ]; then
  echo "Unsupported system."
  exit 1
fi

# --- Installers ---

install_brew_mac() {
  if ! command -v brew >/dev/null 2>&1; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.bash_profile
    source ~/.bash_profile
  fi
}

install_java_mac() {
  brew update
  if brew list | grep -q "openjdk@$JAVA_VERSION"; then
    echo "openjdk@$JAVA_VERSION already installed."
  else
    brew install openjdk@$JAVA_VERSION
  fi

  # Export JAVA_HOME and update PATH
  JAVA_DIR="$(brew --prefix)/opt/openjdk@$JAVA_VERSION"
  if [[ ":$PATH:" != *":$JAVA_DIR/bin:"* ]]; then
    echo "Updating PATH for Java..."
    echo "export PATH=\"$JAVA_DIR/bin:\$PATH\"" >> ~/.bash_profile
    echo "export JAVA_HOME=\"$JAVA_DIR\"" >> ~/.bash_profile
    source ~/.bash_profile
  fi

  java -version
}

install_java_linux() {
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y wget gnupg

    wget -qO - https://repos.azul.com/azul-repo.key | sudo apt-key add -
    echo "deb https://repos.azul.com/zululinux stable main" | sudo tee /etc/apt/sources.list.d/zulu.list

    sudo apt-get update
    sudo apt-get install -y zulu${JAVA_VERSION}-jdk
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y wget

    sudo rpm --import https://repos.azul.com/azul-repo.key
    sudo tee /etc/yum.repos.d/zulu.repo <<EOF
[zulu]
name=Azul Systems, Inc. - Zulu OpenJDK
baseurl=https://repos.azul.com/zulu/rpm
enabled=1
gpgcheck=1
gpgkey=https://repos.azul.com/azul-repo.key
EOF

    sudo yum install -y zulu${JAVA_VERSION}-jdk
  else
    echo "Unsupported package manager."
    exit 1
  fi

  java -version
}

install_java_termux() {
  pkg update -y
  pkg upgrade -y

  if pkg search openjdk-${JAVA_VERSION} | grep -q "openjdk-${JAVA_VERSION}"; then
    pkg install -y openjdk-${JAVA_VERSION}
  else
    echo "Requested Java version not available."
    echo "Available Java versions:"
    pkg search openjdk | grep "openjdk"

    echo "Installing openjdk-17 instead..."
    pkg install -y openjdk-17
  fi

  java -version
}

# --- Run Installer based on OS ---

case "$machine" in
  Mac)
    install_brew_mac
    install_java_mac
    ;;
  Linux)
    install_java_linux
    ;;
  Termux)
    install_java_termux
    ;;
esac