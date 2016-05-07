using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace HelloWPF
{
    enum ParserMode
	{
        RefKerato=0, PrintOut
	}

    class Measurement
    {
        public double VD { get; set; }
        public double R1 { get; set; }
        public double R2 { get; set; }
        public double D1 { get; set; }
        public double D2 { get; set; }
        public double AX { get; set; }
        public double CYL { get; set; }
        public double rr { get; set; }
        public double dd { get; set; }
        public double S { get; set; }
        public double C { get; set; }
        public double A { get; set; }
    }

    class NVisionParser
    {
        public string RawData { get; set; }
        public ParserMode Mode { get; set; }


        public NVisionParser()
        {

        }

        public NVisionParser(string rawData, ParserMode mode=ParserMode.RefKerato)
        {
            this.RawData = rawData;
            this.Mode = mode;
        }

        public string Parse()
        {

            return "";
        }

    }
}
