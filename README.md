# playlist-tool

Allows users to manipulate their Spotify playlists from a web interface.

### Usage
Register a Spotify API application at: https://developer.spotify.com/dashboard/create.

Clone this repository and navigate to the project directory:
```bash
git clone --depth 1 https://github.com/rares-fodor/playlist-tool.git && cd playlist-tool
```

Create an `.env` file and set your `CLIENT_ID`, `CLIENT_SECRET` and `REDIRECT_URI` with the values of your Spotify API application:
```bash
touch .env && printf "CLIENT_ID=<your-client-id>\nCLIENT_SECRET=<your-client-secret>\nREDIRECT_URI=<your-redirect-uri>\n" > .env
```

Install the required dependencies with `npm install` or `yarn install` and start a server with:
```bash
npm run dev

# Alternatively, you can use the --host flag to listen all addresses.
# This is particularly useful if you want to run the server from a virtual machine with no browser access.
# You can use the host machine's browser to interact with the app.

npm run dev -- --host
```

