using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Deployment.Application;
using System.Drawing;
using System.Linq;
using System.Reflection;
using System.Text;
//using System.Threading.Tasks;
using System.Windows.Forms;

namespace HolylandParser
{
    public partial class Form1 : Form
    {
        AdifParser p;

        public Form1()
        {
            InitializeComponent();
            this.Text = string.Format("HolyGator - Holyland Contest Score Calculator - build{0} (beta)", GetRunningVersion());
            this.AllowDrop = true;
            this.DragEnter += new DragEventHandler(Form1_DragEnter);
            this.DragDrop += new DragEventHandler(Form1_DragDrop);
        }

        private void Form1_DragEnter(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.FileDrop)) e.Effect = DragDropEffects.Copy;
        }

        private void Form1_DragDrop(object sender, DragEventArgs e)
        {
            string[] files = (string[])e.Data.GetData(DataFormats.FileDrop);
            foreach (string file in files)
            {
                parseAdif(file);
            }
        }

        private Version GetRunningVersion()
        {
            try
            {
                return ApplicationDeployment.CurrentDeployment.CurrentVersion;
            }
            catch
            {
                return Assembly.GetExecutingAssembly().GetName().Version;
            }
        }
        private void button1_Click(object sender, EventArgs e)
        {
            LoadFile();
        }

        private void LoadFile()
        {
            if (openFileDialog1.ShowDialog() == DialogResult.OK)
            {
                parseAdif(openFileDialog1.FileName);
            }
        }

        private void parseAdif(string filename)
        {
            
            try
            {
                if (foreignRB.Checked)
                {
                    p = new AdifParser(filename, "foreign");
                }
                else if (israeliRB.Checked)
                {
                    p = new AdifParser(filename, "israeli");
                }
                p.Parse();
                webBrowser1.DocumentText = p.Template;
            }
            catch (Exception ex)
            {
                MessageBox.Show("There was a problem parsing the file:\r\n" + ex.Message);
            }
        }

      
        private void panel1_Paint(object sender, EventArgs e)
        {
            List<string> msg = new List<string>(15);
            msg.Add("Please stop..");
            msg.Add("You're bothering me..");
            msg.Add("Hey, I said enough..");
            msg.Add("Come on man!");
            msg.Add("Leave me in your mother...");
            msg.Add("Hey, conduct yourself!");
            msg.Add("Ha Ha, Now you are just being silly");
            msg.Add("Did I tell you to STOP?!");
            msg.Add("Hmmm... NO!!");
            msg.Add("That tickled");
            msg.Add("This behaviour will not add points to your result!");
            msg.Add("O.K. I'm calling Mark KX");
            msg.Add("Do you want me to call Malik?!! Crazy OM.");

            Random r = new Random();

            MessageBox.Show(msg.ToArray()[r.Next(0, 12)]);
        }

        private void foreignRB_CheckedChanged(object sender, EventArgs e)
        {
            if (p != null)
            {
                p.logType = israeliRB.Checked ? "israeli" : "foreign";
                p.Parse();
                webBrowser1.DocumentText = p.Template;
            }
        }

        private void toolStripMenuItem1_Click(object sender, EventArgs e)
        {
            LoadFile();
        }

        private void toolStripMenuItem3_Click(object sender, EventArgs e)
        {
            Application.Exit();
        }
    }
}