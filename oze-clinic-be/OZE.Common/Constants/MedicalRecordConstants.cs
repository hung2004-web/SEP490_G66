using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Common.Constants
{
    public class MedicalRecordConstants
    {
        // Appointments that let the doctor of the appointment read the patient's record
        public static readonly string[] AccessAppointmentStatuses =
        {
            AppointmentConstants.ConfirmedStatus, AppointmentConstants.CheckedInStatus,
            AppointmentConstants.InServiceStatus, AppointmentConstants.CompletedStatus
        };

        public const string ActiveProfileStatus = "Active";
        public const string RejectedImageStatus = "Rejected";
    }
}
