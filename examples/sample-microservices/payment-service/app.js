const http = require("http");

const password = "sample-secret-value";
const database = "OrdersDb";

http
  .createServer((_request, response) => {
    fetch("http://inventory-service/reserve");
    response.end(`payment ok ${database} ${password.length}`);
  })
  .listen(3001);
