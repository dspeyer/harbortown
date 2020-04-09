# The Board Game Le Havre, with Social Distancing

The original [Le Havre](https://smile.amazon.com/Mayfair-Games-MFG3518-Le-Havre/dp/B01N17W07Y/ref=sr_1_1?dchild=1&keywords=le+havre&qid=1586405294&sr=8-1) is by Uwe Rosenberg.

You can play this at https://harbortowngame.herokuapp.com/

## Development Notes

The client is React based and can be run with react's dev-server using `npm run-script clientonly`.  The client must be compiled (with `npm run-script build`) to be served by the server.  The `src/common` directory contains code that will be invoked from both client and server, and includes most of the actual game logic.  Because it can be invoked from either, it cannot import either (though it still has many callbacks passed in from either as dependency injection).

Developing client-only requires nothing but react.  Developing the server requires MongoDB, a gmail account to send notifications from, and an RSA private key.  Search for `process.env` in the server code to see how all of these apply.