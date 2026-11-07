using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OZE.Application.Interfaces;
using OZE.Common.Constants;
using OZE.Common.Models;
using OZE.Common.Models.Base;

namespace OZE.Controllers
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
        public async Task<ActionResult<ApiResponse<List<RoomResponse>>>> GetRoomsAsync([FromQuery] RoomQueryRequest query, CancellationToken cancellationToken)
        {
            var rooms = await _roomService.GetRoomsAsync(query, cancellationToken);
            return Ok(ApiResponse<List<RoomResponse>>.SuccessResult(rooms));
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<ApiResponse<RoomResponse>>> GetRoomByIdAsync(int id, CancellationToken cancellationToken)
        {
            var room = await _roomService.GetRoomByIdAsync(id, cancellationToken);
            return Ok(ApiResponse<RoomResponse>.SuccessResult(room));
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<RoomResponse>>> CreateRoomAsync([FromBody] CreateRoomRequest request, CancellationToken cancellationToken)
        {
            var room = await _roomService.CreateRoomAsync(request, cancellationToken);
            return Ok(ApiResponse<RoomResponse>.SuccessResult(room, ErrorConstants.RoomMessage.RoomCreated));
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse<RoomResponse>>> UpdateRoomAsync(int id, [FromBody] UpdateRoomRequest request, CancellationToken cancellationToken)
        {
            var room = await _roomService.UpdateRoomAsync(id, request, cancellationToken);
            return Ok(ApiResponse<RoomResponse>.SuccessResult(room, ErrorConstants.RoomMessage.RoomUpdated));
        }

        [HttpDelete("{id:int}")]
        public async Task<ActionResult<ApiResponse>> DeleteRoomAsync(int id, CancellationToken cancellationToken)
        {
            await _roomService.DeleteRoomAsync(id, cancellationToken);
            return Ok(ApiResponse.SuccessResult(ErrorConstants.RoomMessage.RoomDeleted));
        }
    }
}
