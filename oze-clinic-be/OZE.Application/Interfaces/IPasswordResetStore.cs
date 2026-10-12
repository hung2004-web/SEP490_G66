using OZE.Common.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace OZE.Application.Interfaces
{
    public  interface IPasswordResetStore
    {
        void Save(PasswordResetSession session, TimeSpan timeToLive);
        PasswordResetSession? Get(string sessionId);
        void Remove(string sessionId);
    }
}
