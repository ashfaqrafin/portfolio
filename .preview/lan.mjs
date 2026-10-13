process.argv.splice(2,0,"http://192.168.1.2:3000/?hero-debug",".preview/lan","1280","800","1","1.5");
await import("./shot.mjs");
