npx esbuild --format=cjs --target=node21 --platform=node --bundle --outfile=bundle.js dist/app.js
node --experimental-sea-config sea-config.json
cp $(command -v node) ucrtool-server
npx postject ucrtool-server NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
node --experimental-sea-config sea-config.json
