namespace OZE.Common.Constants
{
    public static class CashSessionConstants
    {
        public const string Open = "Open";
        public const string Closed = "Closed";

        public static readonly string[] Statuses = { Open, Closed };

        // Kinds of cash paid out of the drawer during a session
        public const string ExpenseSupplies = "Supplies";
        public const string ExpenseOther = "Other";

        public static readonly string[] ExpenseCategories = { ExpenseSupplies, ExpenseOther };

        public const int DescriptionMaxLength = 300;
        public const int NotesMaxLength = 500;
    }
}
