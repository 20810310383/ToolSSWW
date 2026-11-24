const fs=require('fs');let s=fs.readFileSync('desktop/runner.cjs','utf8').replaceAll("p.goto(config.root+'/es/cart'","p.goto(config.cartUrl");fs.writeFileSync('desktop/runner.cjs',s);
