using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.ProjectBase.Controllers
{
    [ApiController]
    [Authorize(Roles = RoleConstants.ClinicManagerRole)]
    [Route("api/[controller]")]
    public class RoomsController : ControllerBase
    {
        private readonly IRoomService _roomService;

        public RoomsController(IRoomService roomService)
        {
            _roomService = roomService;
        }

        [HttpGet]

        public async Task<ActionResult<ApiResponse<List<RoomResponse>>>> GetRoomsAsync([FromQuery] RoomQueryRequest query)
        {
            var rooms = await _roomService.GetRoomsAsync(query);
            return Ok(ApiResponse<List<RoomResponse>>.SuccessResult(rooms));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<RoomResponse>>> GetRoomByIdAsync(int id)
        {
            var room = await _roomService.GetRoomByIdAsync(id);
            return Ok(ApiResponse<RoomResponse>.SuccessResult(room));
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<RoomResponse>>> CreateRoomAsync([FromBody] CreateRoomRequest request)
        {
            var room = await _roomService.CreateRoomAsync(request);
            return Ok(ApiResponse<RoomResponse>.SuccessResult(room, "Room created successfully"));
        }
    }
}
