{ pkgs ? import <nixpkgs> {} }:

(pkgs.buildFHSEnv {
  name = "ass-cw1";
  targetPkgs = pkgs: (with pkgs; [
    nodejs
    prisma-engines
    openssl
    docker-compose
  ]);
  profile = ''
    export PRISMA_QUERY_ENGINE_LIBRARY="${pkgs.prisma-engines}/lib/libquery_engine.node"
    export PRISMA_QUERY_ENGINE_BINARY="${pkgs.prisma-engines}/bin/query-engine"
    export PRISMA_SCHEMA_ENGINE_BINARY="${pkgs.prisma-engines}/bin/schema-engine"
  '';
  runScript = "bash";
}).env
