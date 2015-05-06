using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
//using System.Threading.Tasks;
using MoreLinq;

namespace HolylandParser
{
    class AdifParser
    {
        private int _result;
        public int Result { get { return _result; } }

        private string _description;
        public string Description { get { return _description; } }

        public string logType { get; set; }

        private string m_filePath;
        private string m_fileText;
        private List<QSO> m_qsoList;

        private string m_template = @"
<style>
    body{

}
th,td
    {
        border-style:solid;
        border-width:1px;
        border-color:black;
    }
</style>

<table cellpadding='0' cellspacing='0' style='border-style:solid; border-width:1px; border-color:black'>
    <thead>
        <tr>
            <th style='width:150px; text-align:center'>Band</th>
            <th style='width:150px; text-align:center'>QSO</th>
            <th style='width:150px; text-align:center'>Points</th>
            <th style='width:150px; text-align:center'>Squares</th>
            <th style='width:150px; text-align:center'>DXCC</th>
            <th style='width:150px; text-align:center'>Score</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td style='width:150px; text-align:center'>10</td>
<td style='width:150px; text-align:center'>~QSO10~</td>            
<td style='width:150px; text-align:center'>~POINTS10~</td>
            
            <td style='width:150px; text-align:center'>~SQUARES10~</td>
            <td style='width:150px; text-align:center'>~DXCC10~</td>
            <td style='width:150px; text-align:center'></td>
        </tr>
        <tr>
            <td style='width:150px; text-align:center'>15</td>
<td style='width:150px; text-align:center'>~QSO15~</td>            
<td style='width:150px; text-align:center'>~POINTS15~</td>
            
            <td style='width:150px; text-align:center'>~SQUARES15~</td>
            <td style='width:150px; text-align:center'>~DXCC15~</td>
            <td style='width:150px; text-align:center'></td>
        </tr>
        <tr>
            <td style='width:150px; text-align:center'>20</td>
<td style='width:150px; text-align:center'>~QSO20~</td>            
<td style='width:150px; text-align:center'>~POINTS20~</td>
            
            <td style='width:150px; text-align:center'>~SQUARES20~</td>
            <td style='width:150px; text-align:center'>~DXCC20~</td>
            <td style='width:150px; text-align:center'></td>
        </tr>
        <tr>
            <td style='width:150px; text-align:center'>40</td>
<td style='width:150px; text-align:center'>~QSO40~</td>            
<td style='width:150px; text-align:center'>~POINTS40~</td>
            
            <td style='width:150px; text-align:center'>~SQUARES40~</td>
            <td style='width:150px; text-align:center'>~DXCC40~</td>
            <td style='width:150px; text-align:center'></td>
        </tr>
        <tr>
            <td style='width:150px; text-align:center'>80</td>
<td style='width:150px; text-align:center'>~QSO80~</td>            
<td style='width:150px; text-align:center'>~POINTS80~</td>
            
            <td style='width:150px; text-align:center'>~SQUARES80~</td>
            <td style='width:150px; text-align:center'>~DXCC80~</td>
            <td style='width:150px; text-align:center'></td>
        </tr>
        <tr>
            <td style='width:150px; text-align:center'>160</td>
<td style='width:150px; text-align:center'>~QSO160~</td>            
<td style='width:150px; text-align:center'>~POINTS160~</td>
            
            <td style='width:150px; text-align:center'>~SQUARES160~</td>
            <td style='width:150px; text-align:center'>~DXCC160~</td>
            <td style='width:150px; text-align:center'></td>
        </tr>
        <tr>
            <td style='width:150px; text-align:center'>Total</td>
<td style='width:150px; text-align:center'>~QSO~</td>            
<td style='width:150px; text-align:center'>~POINTS~</td>
            
            <td style='width:150px; text-align:center'>~SQUARES~</td>
            <td style='width:150px; text-align:center'>~DXCC~</td>
            <td style='width:150px; text-align:center'>~SCORE~</td>
        </tr>
    </tbody>
</table><br /><br />";
        private string m_templateRes;
        public string Template { get { return m_templateRes; } }

        //patterns
        private string call_pattern = @"<call:(\d{1,2})(?::[a-z]{1})?>";
        private string date_pattern = @"<qso_date:(\d{1,2})(?::[a-z]{1})?>";
        private string time_pattern = @"<time_on:(\d{1,2})(?::[a-z]{1})?>";
        private string band_pattern = @"<band:(\d{1,2})(?::[a-z]{1})?>";
        private string mode_pattern = @"<mode:(\d{1,2})(?::[a-z]{1})?>";
        private string commant_pattern = @"<comment:(\d{1,2})(?::[a-z]{1})?>";
        private string dxcc_pattern = @"<dxcc:(\d{1,2})(?::[a-z]{1})?>";
        private string freq_pattern = @"<freq:(\d{1,2})(?::[a-z]{1})?>";
        private string srx_pattern = @"<srx:(\d{1,2})(?::[a-z]{1})?>";
        //private string name_pattern = @"<name:(\d)(?::[a-z]{1})?>";


        public AdifParser(string filePath, string logType)
        {
            m_filePath = filePath;
            this.logType = logType;
            m_qsoList = new List<QSO>();
        }

        public void Parse()
        {
            ReadFile();
            PopulateQSOList();
            CalculateResult();
        }

        private void ReadFile()
        {
            m_fileText = System.IO.File.ReadAllText(m_filePath);
        }

        private void PopulateQSOList()
        {
            m_qsoList.Clear();
            //Remove Line breakers
            string oneLiner = Regex.Replace(m_fileText, "\r\n", "");
            oneLiner = Regex.Replace(oneLiner, "\r", "");
            oneLiner = Regex.Replace(oneLiner, "\n", "");

            //Splite the Header
            string[] spliteHeader = Regex.Split(oneLiner, "<EOH>", RegexOptions.IgnoreCase);

            //Get the body
            string body = spliteHeader[1];

            //Splite body to lines
            string[] rows = Regex.Split(body, "<EOR>", RegexOptions.IgnoreCase);

            foreach (string row in rows)
            {
                //skip empty rows
                if (string.IsNullOrEmpty(row)) continue;

                QSO qso_row = new QSO();

                Regex regex = new Regex(band_pattern, RegexOptions.IgnoreCase);
                Match match = regex.Match(row);
                if (match.Success)
                {
                    qso_row.Band = Regex.Split(row, band_pattern, RegexOptions.IgnoreCase)[2].Substring(0, int.Parse(match.Groups[1].Value));
                }

                regex = new Regex(call_pattern, RegexOptions.IgnoreCase);
                match = regex.Match(row);
                if (match.Success)
                {
                    qso_row.Call = Regex.Split(row, call_pattern, RegexOptions.IgnoreCase)[2].Substring(0, int.Parse(match.Groups[1].Value));
                }

                regex = new Regex(date_pattern, RegexOptions.IgnoreCase);
                match = regex.Match(row);
                if (match.Success)
                {
                    qso_row.Date = Regex.Split(row, date_pattern, RegexOptions.IgnoreCase)[2].Substring(0, int.Parse(match.Groups[1].Value));
                }

                regex = new Regex(mode_pattern, RegexOptions.IgnoreCase);
                match = regex.Match(row);
                if (match.Success)
                {
                    qso_row.Mode = Regex.Split(row, mode_pattern, RegexOptions.IgnoreCase)[2].Substring(0, int.Parse(match.Groups[1].Value));
                }

                regex = new Regex(time_pattern, RegexOptions.IgnoreCase);
                match = regex.Match(row);
                if (match.Success)
                {
                    qso_row.Time = Regex.Split(row, time_pattern, RegexOptions.IgnoreCase)[2].Substring(0, int.Parse(match.Groups[1].Value));
                }

                regex = new Regex(commant_pattern, RegexOptions.IgnoreCase);
                match = regex.Match(row);
                if (match.Success)
                {
                    qso_row.Comment = Regex.Split(row, commant_pattern, RegexOptions.IgnoreCase)[2].Substring(0, int.Parse(match.Groups[1].Value));
                }

                regex = new Regex(dxcc_pattern, RegexOptions.IgnoreCase);
                match = regex.Match(row);
                if (match.Success)
                {
                    qso_row.DXCC = Regex.Split(row, dxcc_pattern, RegexOptions.IgnoreCase)[2].Substring(0, int.Parse(match.Groups[1].Value));
                }

                regex = new Regex(freq_pattern, RegexOptions.IgnoreCase);
                match = regex.Match(row);
                if (match.Success)
                {
                    qso_row.Freq = Regex.Split(row, freq_pattern, RegexOptions.IgnoreCase)[2].Substring(0, int.Parse(match.Groups[1].Value));
                }
                regex = new Regex(srx_pattern, RegexOptions.IgnoreCase);
                match = regex.Match(row);
                if (match.Success)
                {
                    qso_row.SRX = Regex.Split(row, srx_pattern, RegexOptions.IgnoreCase)[2].Substring(0, int.Parse(match.Groups[1].Value));
                }               

                qso_row.StandartizeQSO();
                m_qsoList.Add(qso_row);
            }
        }
        private void CalculateResult()
        {
            StringBuilder log = new StringBuilder();
            IEnumerable<QSO> validQSOs;
            if (logType == "foreign")
            {
                validQSOs = m_qsoList.Where(p => p.IsValid && p.IsIsraeli).DistinctBy(p => p.HASH);
            }
            else
            {
                validQSOs = m_qsoList.Where(p => p.IsValid).DistinctBy(p => p.HASH);
            }


            log.Append("You sent a total of "); log.Append(m_qsoList.Count()); log.Append(" QSO's, "); log.Append(validQSOs.Count()); log.Append(" are valid\r\n");
            log.Append("-----------------------------------------------------------------------------------------------------------\r\n");

            int single_point = validQSOs.Count(p => p.Band.Contains("10") || p.Band.Contains("15") || p.Band.Contains("20"));
            int double_point = validQSOs.Count(p => p.Band.Contains("40") || p.Band.Contains("80") || p.Band.Contains("160"));
            int total_points = single_point + double_point * 2;
            log.Append("You get a score of: "); log.Append(total_points); log.Append(" points\r\n");
            log.Append("-----------------------------------------------------------------------------------------------------------\r\n");

            var DistinctContacts10 = validQSOs.Where(p => p.Band.Contains("10")).DistinctBy(p => p.HASH);
            log.Append(DistinctContacts10.Count()); log.Append(" distinct Contacts on 10m\r\n");
            var DistinctContacts15 = validQSOs.Where(p => p.Band.Contains("15")).DistinctBy(p => p.HASH);
            log.Append(DistinctContacts15.Count()); log.Append(" distinct Contacts on 15m\r\n");
            var DistinctContacts20 = validQSOs.Where(p => p.Band.Contains("20")).DistinctBy(p => p.HASH);
            log.Append(DistinctContacts20.Count()); log.Append(" distinct Contacts on 20m\r\n");
            var DistinctContacts40 = validQSOs.Where(p => p.Band.Contains("40")).DistinctBy(p => p.HASH);
            log.Append(DistinctContacts40.Count()); log.Append(" distinct Contacts on 40m\r\n");
            var DistinctContacts80 = validQSOs.Where(p => p.Band.Contains("80")).DistinctBy(p => p.HASH);
            log.Append(DistinctContacts80.Count()); log.Append(" distinct Contacts on 80m\r\n");
            var DistinctContacts160 = validQSOs.Where(p => p.Band.Contains("160")).DistinctBy(p => p.HASH);
            log.Append(DistinctContacts160.Count()); log.Append(" distinct Contacts on 160m\r\n");
            int AllBandContacts = DistinctContacts10.Count() + DistinctContacts15.Count() + DistinctContacts20.Count() + DistinctContacts40.Count() + DistinctContacts80.Count() + DistinctContacts160.Count();
            log.Append("-----------------------------------------------------------------------------------------------------------\r\n");

            var DistinctSquares10 = validQSOs.Where(p => p.Band.Contains("10") && p.IsIsraeli).DistinctBy(p => p.Comment.ToLower());
            log.Append(DistinctSquares10.Count()); log.Append(" distinct squares on 10m\r\n");
            var DistinctSquares15 = validQSOs.Where(p => p.Band.Contains("15") && p.IsIsraeli).DistinctBy(p => p.Comment.ToLower());
            log.Append(DistinctSquares15.Count()); log.Append(" distinct squares on 15m\r\n");
            var DistinctSquares20 = validQSOs.Where(p => p.Band.Contains("20") && p.IsIsraeli).DistinctBy(p => p.Comment.ToLower());
            log.Append(DistinctSquares20.Count()); log.Append(" distinct squares on 20m\r\n");
            var DistinctSquares40 = validQSOs.Where(p => p.Band.Contains("40") && p.IsIsraeli).DistinctBy(p => p.Comment.ToLower());
            log.Append(DistinctSquares40.Count()); log.Append(" distinct squares on 40m\r\n");
            var DistinctSquares80 = validQSOs.Where(p => p.Band.Contains("80") && p.IsIsraeli).DistinctBy(p => p.Comment.ToLower());
            log.Append(DistinctSquares80.Count()); log.Append(" distinct squares on 80m\r\n");
            var DistinctSquares160 = validQSOs.Where(p => p.Band.Contains("160") && p.IsIsraeli).DistinctBy(p => p.Comment.ToLower());
            log.Append(DistinctSquares160.Count()); log.Append(" distinct squares on 160m\r\n");
            int AllBandSquares = DistinctSquares10.Count() + DistinctSquares15.Count() + DistinctSquares20.Count() + DistinctSquares40.Count() + DistinctSquares80.Count() + DistinctSquares160.Count();
            //log.Append(AllBandSquares); log.Append(" squares in all bands\r\n");
            log.Append("-----------------------------------------------------------------------------------------------------------\r\n");
            int IsraeliOn10 = DistinctSquares10.Count() > 0 ? 1 : 0;
            int IsraeliOn15 = DistinctSquares15.Count() > 0 ? 1 : 0;
            int IsraeliOn20 = DistinctSquares20.Count() > 0 ? 1 : 0;
            int IsraeliOn40 = DistinctSquares40.Count() > 0 ? 1 : 0;
            int IsraeliOn80 = DistinctSquares80.Count() > 0 ? 1 : 0;
            int IsraeliOn160 = DistinctSquares160.Count() > 0 ? 1 : 0;
            int AllBandIsraeliStations = IsraeliOn10 + IsraeliOn15 + IsraeliOn20 + IsraeliOn40 + IsraeliOn80 + IsraeliOn160;
            //log.Append("You have contacted Israeli stations on "); log.Append(AllBandIsraeliStations); log.Append(" bands\r\n");

            var DistinctDXCC10 = validQSOs.Where(p => p.Band.Contains("10") && !p.IsIsraeli).DistinctBy(p => p.DXCC.ToLower());
            log.Append(DistinctDXCC10.Count()); log.Append(" distinct DXCC on 10m\r\n");
            var DistinctDXCC15 = validQSOs.Where(p => p.Band.Contains("15") && !p.IsIsraeli).DistinctBy(p => p.DXCC.ToLower());
            log.Append(DistinctDXCC15.Count()); log.Append(" distinct DXCC on 15m\r\n");
            var DistinctDXCC20 = validQSOs.Where(p => p.Band.Contains("20") && !p.IsIsraeli).DistinctBy(p => p.DXCC.ToLower());
            log.Append(DistinctDXCC20.Count()); log.Append(" distinct DXCC on 20m\r\n");
            var DistinctDXCC40 = validQSOs.Where(p => p.Band.Contains("40") && !p.IsIsraeli).DistinctBy(p => p.DXCC.ToLower());
            log.Append(DistinctDXCC40.Count()); log.Append(" distinct DXCC on 40m\r\n");
            var DistinctDXCC80 = validQSOs.Where(p => p.Band.Contains("80") && !p.IsIsraeli).DistinctBy(p => p.DXCC.ToLower());
            log.Append(DistinctDXCC80.Count()); log.Append(" distinct DXCC on 80m\r\n");
            var DistinctDXCC160 = validQSOs.Where(p => p.Band.Contains("160") && !p.IsIsraeli).DistinctBy(p => p.DXCC.ToLower());
            log.Append(DistinctDXCC160.Count()); log.Append(" distinct DXCC on 160m\r\n");
            int AllBandDXCC = DistinctDXCC10.Count() + DistinctDXCC15.Count() + DistinctDXCC20.Count() + DistinctDXCC40.Count() + DistinctDXCC80.Count() + DistinctDXCC160.Count();
            //log.Append(AllBandDXCC); log.Append(" DXCC in all bands\r\n");
            log.Append("-----------------------------------------------------------------------------------------------------------\r\n");

            if (logType == "foreign")
            {
                log.Append(AllBandSquares); log.Append(" squares in all bands\r\n");
                log.Append("You have contacted Israeli stations on "); log.Append(AllBandIsraeliStations); log.Append(" bands\r\n");
                log.Append("-----------------------------------------------------------------------------------------------------------\r\n");
                _result = total_points * (AllBandSquares + AllBandIsraeliStations);
            }
            else if (logType == "israeli")
            {
                log.Append(AllBandSquares); log.Append(" squares in all bands\r\n");
                log.Append(AllBandDXCC); log.Append(" DXCC entities in all bands\r\n");
                log.Append("You have contacted Israeli stations on "); log.Append(AllBandIsraeliStations); log.Append(" bands\r\n");
                log.Append("-----------------------------------------------------------------------------------------------------------\r\n");
                _result = total_points * (AllBandSquares + AllBandIsraeliStations + AllBandDXCC);
            }
            log.Append("Your total score is "); log.Append(_result); log.Append("\r\n");
            log.Append("\r\n"); log.Append("\r\n"); log.Append("Thank you for sending the log. Good luck in the contest");
            _description = log.ToString();

            StringBuilder t_Template = new StringBuilder(m_template);
            t_Template.Replace("~QSO10~", DistinctContacts10.Count().ToString());
            t_Template.Replace("~QSO15~", DistinctContacts15.Count().ToString());
            t_Template.Replace("~QSO20~", DistinctContacts20.Count().ToString());
            t_Template.Replace("~QSO40~", DistinctContacts40.Count().ToString());
            t_Template.Replace("~QSO80~", DistinctContacts80.Count().ToString());
            t_Template.Replace("~QSO160~", DistinctContacts160.Count().ToString());

            t_Template.Replace("~POINTS10~", DistinctContacts10.Count().ToString());
            t_Template.Replace("~POINTS15~", DistinctContacts15.Count().ToString());
            t_Template.Replace("~POINTS20~", DistinctContacts20.Count().ToString());
            t_Template.Replace("~POINTS40~", (DistinctContacts40.Count() * 2).ToString());
            t_Template.Replace("~POINTS80~", (DistinctContacts80.Count() * 2).ToString());
            t_Template.Replace("~POINTS160~", (DistinctContacts160.Count() * 2).ToString());

            t_Template.Replace("~SQUARES10~", DistinctSquares10.Count().ToString());
            t_Template.Replace("~SQUARES15~", DistinctSquares15.Count().ToString());
            t_Template.Replace("~SQUARES20~", DistinctSquares20.Count().ToString());
            t_Template.Replace("~SQUARES40~", DistinctSquares40.Count().ToString());
            t_Template.Replace("~SQUARES80~", DistinctSquares80.Count().ToString());
            t_Template.Replace("~SQUARES160~", DistinctSquares160.Count().ToString());

            t_Template.Replace("~DXCC10~", (DistinctDXCC10.Count() + IsraeliOn10).ToString());
            t_Template.Replace("~DXCC15~", (DistinctDXCC15.Count() + IsraeliOn15).ToString());
            t_Template.Replace("~DXCC20~", (DistinctDXCC20.Count() + IsraeliOn20).ToString());
            t_Template.Replace("~DXCC40~", (DistinctDXCC40.Count() + IsraeliOn40).ToString());
            t_Template.Replace("~DXCC80~", (DistinctDXCC80.Count() + IsraeliOn80).ToString());
            t_Template.Replace("~DXCC160~", (DistinctDXCC160.Count() + IsraeliOn160).ToString());

            t_Template.Replace("~QSO~", validQSOs.Count().ToString());
            t_Template.Replace("~POINTS~", total_points.ToString());
            t_Template.Replace("~SQUARES~", AllBandSquares.ToString());
            t_Template.Replace("~DXCC~", (AllBandDXCC + AllBandIsraeliStations).ToString());
            t_Template.Replace("~SCORE~", _result.ToString());

            t_Template.Append("You sent a total of ").Append(m_qsoList.Count()).Append(" QSO's, ").Append(validQSOs.Count()).Append(" are valid\r\n");

            m_templateRes = t_Template.ToString();
        }

        public string getErrors()
        {
            var invalidQSOs = m_qsoList.Where(p => !p.IsValid);
            StringBuilder s = new StringBuilder();
            foreach (QSO qso in invalidQSOs)
            {
                s.Append(qso.ERROR);
                s.Append("\r\n");
            }
            return s.ToString();
        }

        
    }

}
