namespace OZE.Common.Models
{
    // One tooth of the chart as it stands at the end of an examination
    public class DentalChartToothResponse
    {
        public string ToothNumber { get; set; } = string.Empty;
        public string Condition { get; set; } = string.Empty;
        public string? Surface { get; set; }
        public string? Severity { get; set; }
        public string? Notes { get; set; }
        // True when the doctor recorded this tooth in this examination, false when it comes from an earlier visit
        public bool RecordedInThisExamination { get; set; }
    }
}
