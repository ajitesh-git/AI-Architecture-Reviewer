resource "aws_db_instance" "orders" {
  name = "OrdersDb"
}

resource "aws_db_instance" "payments" {
  name = "PaymentsDb"
}
