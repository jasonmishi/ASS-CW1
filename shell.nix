{ pkgs ? import <nixpkgs> { config.allowUnfree = true; } }:

(pkgs.buildFHSEnv {
  name = "ass-cw1";
  targetPkgs = pkgs: (with pkgs; [
    nodejs
    prisma-engines
    openssl
    docker-compose
    postman
    glib
    gsettings-desktop-schemas
    gtk3
    xdg-utils
    ripgrep
  ]);
  profile = ''
    export PRISMA_QUERY_ENGINE_LIBRARY="${pkgs.prisma-engines}/lib/libquery_engine.node"
    export PRISMA_QUERY_ENGINE_BINARY="${pkgs.prisma-engines}/bin/query-engine"
    export PRISMA_SCHEMA_ENGINE_BINARY="${pkgs.prisma-engines}/bin/schema-engine"

    # Ensure GLib can find GSettings schemas inside the Nix shell.
    export GSETTINGS_SCHEMA_DIR="${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}/glib-2.0/schemas"
    export XDG_DATA_DIRS="${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:${pkgs.glib}/share:''${XDG_DATA_DIRS:-/usr/local/share:/usr/share}"

    # Route Postman writable paths away from immutable Nix store locations.
    export XDG_CONFIG_HOME="''${XDG_CONFIG_HOME:-$HOME/.config}"
    export XDG_CACHE_HOME="''${XDG_CACHE_HOME:-$HOME/.cache}"
    export XDG_STATE_HOME="''${XDG_STATE_HOME:-$HOME/.local/state}"

    # Helper launcher for Postman in Nix/FHS shells.
    # --no-sandbox avoids chrome-sandbox mode errors in non-setuid environments.
    postman() {
      POSTMAN_DISABLE_AUTO_UPDATE=1 \
      POSTMAN_DISABLE_UPDATE=1 \
      "${pkgs.postman}/bin/postman" --no-sandbox "$@"
    }
  '';
  runScript = "bash";
}).env
