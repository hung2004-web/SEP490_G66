using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.OpenApi.Models;
using OZE.Application.Interfaces;
using OZE.Application.Services;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
{
    [ApiController]
    [AllowAnonymous]
    [Route("api/[controller]")]
    public class HomeController : ControllerBase
    {
        private readonly IHomeService ser;
        public HomeController(IHomeService _ser)
        {
            ser = _ser;
        }
        [HttpGet]
        public async Task<ActionResult<ApiResponse<HomePageResponse>>> GetHomeAsync()
        {
            var homePage = await ser.GetHomePageAsync();
            return Ok(ApiResponse<HomePageResponse>.SuccessResult(homePage));
        }
    }
}
