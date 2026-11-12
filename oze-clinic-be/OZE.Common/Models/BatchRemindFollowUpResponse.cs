using System;
using System.Collections.Generic;

namespace OZE.Common.Models
{
    /// <summary>
    /// Response model summarizing the result of a batch automated or manual follow-up reminder execution.
    /// </summary>
    public class BatchRemindFollowUpResponse
    {
        /// <summary>
        /// Target calendar date for which follow-up candidates were queried and reminded.
        /// </summary>
        public DateOnly TargetDate { get; set; }

        /// <summary>
        /// Total number of patients identified as eligible for follow-up reminders.
        /// </summary>
        public int TotalTargeted { get; set; }

        /// <summary>
        /// Total number of patients who successfully received reminders.
        /// </summary>
        public int RemindedCount { get; set; }

        /// <summary>
        /// Total number of failed dispatch attempts during the batch operation.
        /// </summary>
        public int FailedCount { get; set; }

        /// <summary>
        /// List of individual follow-up items processed and notified.
        /// </summary>
        public List<FollowUpListItemResponse> RemindedItems { get; set; } = new();
    }
}
