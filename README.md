# Commands for CMSC 128.1
## How to install React app
`npx create-vite@latest frontend` (fastest implementation for react app)

### Under the React app
`npm install` - (this is for downloading the node modules)\
`npm install axios` - (this is for downloading rooting)
`npm run dev` - (command for running the react app)

## How to Create Node.js backend
`mkdir backend`\
`cd backend`\
`npm init -y` - initializes a new node.js project in the current folder\
`npm install express mysql2 cors body-parser`
- express for building web servers under Node.js
- MySql client that connects to MySQL db
- Cors: middleware that lets your backend accept requests from a different origin

## To run both services
### In one terminal run
Under backend\
`node server.js`

Under frontend\
`npm run dev`

## Others
`npm install bootstrap` - for bootstrap implementation, then put under main.jsx `import "bootstrap/dist/css/bootstrap.min.css";`
