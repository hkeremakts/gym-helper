<%@ WebHandler Language="C#" Class="ApiHandler" %>

using System.Web;

public class ApiHandler : IHttpHandler
{
    public bool IsReusable { get { return true; } }
    public void ProcessRequest(HttpContext ctx) { Api.Handle(ctx); }
}
