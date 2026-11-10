using System;
using System.Collections.Generic;

namespace OZE.Common.Models
{
    public class BatchRemindFollowUpResponse
    {
        public DateOnly TargetDate { get; set; }
        public int TotalTargeted { get; set; }
        public int RemindedCount { get; set; }
        public int FailedCount { get; set; }
        public List<FollowUpListItemResponse> RemindedItems { get; set; } = new();
    }
}
