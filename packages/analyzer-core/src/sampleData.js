export const SAMPLE_FILES = [
  {
    name: 'order-service/src/OrderClient.cs',
    size: 2140,
    text: 'public class OrderClient { var token = "secret-12345"; httpClient.GetAsync("http://payment-service/api/payments"); httpClient.GetAsync("http://inventory-service/api/items"); }'
  },
  {
    name: 'payment-service/app.js',
    size: 1850,
    text: 'const password = "p@ssw0rd"; fetch("http://inventory-service/reserve"); const db = "OrdersDb";'
  },
  {
    name: 'inventory-service/openapi.yaml',
    size: 1620,
    text: 'openapi: 3.0.0\npaths:\n  /items:\n  /stock:\n  /reserve:\ncomponents:\n  schemas:\n    Item: {}'
  },
  {
    name: 'infra/main.tf',
    size: 920,
    text: 'resource "aws_db_instance" "orders" { name = "OrdersDb" }\nresource "aws_db_instance" "payments" { name = "PaymentsDb" }'
  }
];
