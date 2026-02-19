{ pkgs ? import <nixpkgs> {} }:

(pkgs.buildFHSEnv {
  name = "ass-cw1";
  targetPkgs = pkgs: (with pkgs;
    [ 
      nodejs
    ]);
  runScript = "bash";
}).env