namespace Sample.OrderService;

public sealed class OrderClient
{
    private readonly HttpClient httpClient = new();

    public async Task SubmitOrderAsync()
    {
        await httpClient.GetAsync("http://payment-service/api/payments");
        await httpClient.GetAsync("http://inventory-service/api/items");
    }
}
