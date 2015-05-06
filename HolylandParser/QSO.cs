using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
//using System.Threading.Tasks;

namespace HolylandParser
{
    public class QSO
    {
        public bool IsIsraeli { get; set; }
        public bool IsValid { get; set; }
        public string Call { get; set; }
        public string Date { get; set; }
        public string Time { get; set; }
        public string Band { get; set; }
        public string Mode { get; set; }
        public string Name { get; set; }
        public string Freq { get; set; }
        public string Comment { get; set; }
        public string DXCC { get; set; }
        public string SRX { get; set; }
        public string HASH { get; set; }
        public string ERROR { get; set; }
        

        public void StandartizeQSO()
        {
            IsValid = false;
            IsIsraeli = !string.IsNullOrEmpty(Call) && (Call.StartsWith("4X", true, System.Globalization.CultureInfo.CurrentCulture) || Call.StartsWith("4Z", true, System.Globalization.CultureInfo.CurrentCulture));
            string pattern = @"([a-zA-Z]{1})[-/\\_ ]*([0-9]{1,2})[-/\\_ ]*([a-zA-Z]{2})";
            Regex regex = new Regex(pattern, RegexOptions.IgnoreCase);
            if (IsValidComment())
            {
                Match match = regex.Match(Comment);
                if (match.Success)
                {
                    this.Comment = match.Groups[1].Value + match.Groups[2].Value + match.Groups[3].Value;
                    IsValid = IsValidCall() && IsValidBand() && IsValidMode() && IsValidComment() && IsValidDXCC() && IsIsraeli;
                    if (IsValid) HASH = Call + Band + Mode + Comment;
                }
                else
                {
                    pattern = @"(\d+)";
                    regex = new Regex(pattern, RegexOptions.IgnoreCase);
                    match = regex.Match(Comment);
                    if (match.Success)
                    {
                        this.Comment = match.Groups[1].Value;
                        IsValid = IsValidCall() && IsValidBand() && IsValidMode() && IsValidComment() && IsValidDXCC() && !IsIsraeli;
                        if (IsValid) HASH = Call + Band + Mode;
                    }
                }
            }
            else if (IsValidSRX())
            {
                pattern = @"(\d+)";
                regex = new Regex(pattern, RegexOptions.IgnoreCase);
                Match match = regex.Match(SRX);
                if (match.Success)
                {
                    this.Comment = match.Groups[1].Value;
                    IsValid = IsValidCall() && IsValidBand() && IsValidMode() && IsValidComment() && IsValidDXCC() && !IsIsraeli;
                    if (IsValid) HASH = Call + Band + Mode;
                }
            }
        }
        private bool IsValidBand()
        {
            if (string.IsNullOrEmpty(Band) && !string.IsNullOrEmpty(Freq))
            {
                convertFreqToBand();
            }
            bool isValid = !string.IsNullOrEmpty(Band) && (Band.Contains("10") || Band.Contains("15") || Band.Contains("20") || Band.Contains("40") || Band.Contains("80") || Band.Contains("160"));
            if (!isValid) this.ERROR += "Band is not valid: " + Band + " - ";
            return isValid;

        }
        private bool IsValidMode()
        {
            bool isValid = !string.IsNullOrEmpty(Mode) && (Mode.ToLower().Contains("ssb") || Mode.ToLower().Contains("lsb") || Mode.ToLower().Contains("usb") || Mode.ToLower().Contains("cw") || Mode.ToLower().Contains("rtty") || Mode.ToLower().Contains("psk"));
            if (!isValid) this.ERROR += "Mode is not valid: " + Mode + " - ";
            return isValid;
        }
        private bool IsValidCall() {
            bool isValid = !string.IsNullOrEmpty(Call);
            if (!isValid) this.ERROR += "Call is empty -";
            return isValid;
        }
        private bool IsValidComment() {
            bool isValid = !string.IsNullOrEmpty(Comment);
            if (!isValid) this.ERROR += "Comment is empty -";
            return isValid;
        }
        private bool IsValidSRX() {
            bool isValid = !string.IsNullOrEmpty(SRX);
            if (!isValid) this.ERROR += "SRX is empty -";
            return isValid;
        }


        private bool IsValidDXCC() {
            bool isValid = !string.IsNullOrEmpty(DXCC);
            if (!isValid) this.ERROR += "DXCC is empty -";
            return isValid;
        }

        private void convertFreqToBand()
        {
            double parsedFreq;
            if (!double.TryParse(Freq, out parsedFreq)) return;
            if (parsedFreq < 30)
            {
                if (parsedFreq > 0 && parsedFreq < 2) Band = "160";
                if (parsedFreq > 2 && parsedFreq < 5) Band = "80";
                if (parsedFreq > 5 && parsedFreq < 10) Band = "40";
                if (parsedFreq > 12 && parsedFreq < 16) Band = "20";
                if (parsedFreq > 19 && parsedFreq < 23) Band = "15";
                if (parsedFreq > 25 && parsedFreq < 30) Band = "10";
            }
            else
            {
                if (parsedFreq > 0 && parsedFreq < 2000) Band = "160";
                if (parsedFreq > 2000 && parsedFreq < 5000) Band = "80";
                if (parsedFreq > 5000 && parsedFreq < 10000) Band = "40";
                if (parsedFreq > 12000 && parsedFreq < 16000) Band = "20";
                if (parsedFreq > 19000 && parsedFreq < 23000) Band = "15";
                if (parsedFreq > 25000 && parsedFreq < 30000) Band = "10";
            }

        }
    }

    
}
