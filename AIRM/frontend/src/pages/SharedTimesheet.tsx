import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@sdk/api";
import { toast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// import logo from "@/assets/techiemaya-logo.png";
const logo = "/techiemaya-logo.png";

interface TimesheetEntry {
  id: string;
  project: string;
  task: string;
  mon_hours: number;
  tue_hours: number;
  wed_hours: number;
  thu_hours: number;
  fri_hours: number;
  sat_hours: number;
  sun_hours: number;
}

interface Timesheet {
  week_start: string;
  week_end: string;
  timesheet_entries: TimesheetEntry[];
}

const SharedTimesheet = () => {
  const { id } = useParams<{ id: string }>();
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSharedTimesheet();
  }, [id]);

  const loadSharedTimesheet = async () => {
    if (!id) return;

    try {
      // Fetch timesheet by ID directly from API
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
        if (!API_BASE_URL) throw new Error('VITE_API_BASE_URL is not set!');
      const response = await fetch(`${API_BASE_URL}/timesheets/${id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load timesheet');
      }

      const timesheetData = await response.json();
      const timesheet = timesheetData.timesheet || timesheetData;
      const entries = timesheet.entries || [];
      
      setTimesheet({
        week_start: timesheet.week_start,
        week_end: timesheet.week_end || timesheet.week_start,
        timesheet_entries: entries.map((entry: any) => ({
          id: entry.id || `entry-${Date.now()}`,
          project: entry.project || '',
          task: entry.task || '',
          mon_hours: Number(entry.mon_hours) || 0,
          tue_hours: Number(entry.tue_hours) || 0,
          wed_hours: Number(entry.wed_hours) || 0,
          thu_hours: Number(entry.thu_hours) || 0,
          fri_hours: Number(entry.fri_hours) || 0,
          sat_hours: Number(entry.sat_hours) || 0,
          sun_hours: Number(entry.sun_hours) || 0,
        })),
      });
    } catch (error) {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (entry: TimesheetEntry) => {
    return (
      entry.mon_hours +
      entry.tue_hours +
      entry.wed_hours +
      entry.thu_hours +
      entry.fri_hours +
      entry.sat_hours +
      entry.sun_hours
    );
  };

  const calculateDayTotal = (day: keyof TimesheetEntry) => {
    return timesheet?.timesheet_entries.reduce(
      (sum, entry) => sum + (Number(entry[day]) || 0),
      0
    ) || 0;
  };

  const calculateGrandTotal = () => {
    return timesheet?.timesheet_entries.reduce(
      (sum, entry) => sum + calculateTotal(entry),
      0
    ) || 0;
  };

  const formatHours = (hours: number) => {
    return hours % 1 === 0 ? hours.toString() : hours.toFixed(2);
  };

  const getDayDate = (dayIndex: number) => {
    if (!timesheet) return "";
    const weekStart = new Date(timesheet.week_start);
    return format(addDays(weekStart, dayIndex), "dd MMMM yyyy");
  };

  const handleDownload = () => {
    if (!timesheet) return;
    
    const weekStart = new Date(timesheet.week_start);
    const weekEnd = new Date(timesheet.week_end);
    const doc = new jsPDF('landscape');
    
    // Add title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(' Timesheet', 14, 15);
    
    // Add week info
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Week: ${format(weekStart, "dd MMMM yyyy")} - ${format(weekEnd, "dd MMMM yyyy")}`, 14, 22);
    
    // Prepare table data
    const headers = [
      'Project',
      'Task',
      `MON\n${format(addDays(weekStart, 0), "dd MMM")}`,
      `TUE\n${format(addDays(weekStart, 1), "dd MMM")}`,
      `WED\n${format(addDays(weekStart, 2), "dd MMM")}`,
      `THU\n${format(addDays(weekStart, 3), "dd MMM")}`,
      `FRI\n${format(addDays(weekStart, 4), "dd MMM")}`,
      `SAT\n${format(addDays(weekStart, 5), "dd MMM")}`,
      `SUN\n${format(addDays(weekStart, 6), "dd MMM")}`,
      'TOTAL'
    ];
    
    const body: any[] = timesheet.timesheet_entries.map(entry => [
      entry.project,
      entry.task,
      formatHours(entry.mon_hours),
      formatHours(entry.tue_hours),
      formatHours(entry.wed_hours),
      formatHours(entry.thu_hours),
      formatHours(entry.fri_hours),
      formatHours(entry.sat_hours),
      formatHours(entry.sun_hours),
      formatHours(calculateTotal(entry))
    ]);
    
    // Add totals row
    body.push([
      { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
      formatHours(calculateDayTotal("mon_hours")),
      formatHours(calculateDayTotal("tue_hours")),
      formatHours(calculateDayTotal("wed_hours")),
      formatHours(calculateDayTotal("thu_hours")),
      formatHours(calculateDayTotal("fri_hours")),
      formatHours(calculateDayTotal("sat_hours")),
      formatHours(calculateDayTotal("sun_hours")),
      { content: formatHours(calculateGrandTotal()), styles: { fontStyle: 'bold' } }
    ]);
    
    // Generate table
    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 28,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 40 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'center', cellWidth: 20 },
        7: { halign: 'center', cellWidth: 20 },
        8: { halign: 'center', cellWidth: 20 },
        9: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
      },
      didDrawPage: function() {
        // Footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text('*Record all time to the nearest 10th of an hour', 14, doc.internal.pageSize.height - 15);
        doc.text('*Overtime is not authorized without Customer Management Approval', 14, doc.internal.pageSize.height - 10);
      }
    });
    
    // Save PDF
    doc.save(`timesheet_${format(weekStart, "yyyy-MM-dd")}.pdf`);
    
    toast({
      title: "Downloaded",
      description: "Timesheet PDF downloaded successfully",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading timesheet...</p>
      </div>
    );
  }

  if (!timesheet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Timesheet not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center gap-3">
          <img src={logo} alt="TechieMaya Logo" className="h-40 w-auto" />
          <h1 className="text-2xl font-bold">Timesheet</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Weekly Timesheet</CardTitle>
              <Button variant="outline" onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="font-semibold">Beginning Monday: </span>
                {format(new Date(timesheet.week_start), "dd MMMM yyyy")}
              </div>
              <div>
                <span className="font-semibold">Ending Sunday: </span>
                {format(new Date(timesheet.week_end), "dd MMMM yyyy")}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="border border-border bg-muted p-2 text-left font-semibold">
                      Project
                    </th>
                    <th className="border border-border bg-muted p-2 text-left font-semibold">
                      Task
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      <div>MON</div>
                      <div className="text-xs font-normal">{getDayDate(0)}</div>
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      <div>TUE</div>
                      <div className="text-xs font-normal">{getDayDate(1)}</div>
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      <div>WED</div>
                      <div className="text-xs font-normal">{getDayDate(2)}</div>
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      <div>THU</div>
                      <div className="text-xs font-normal">{getDayDate(3)}</div>
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      <div>FRI</div>
                      <div className="text-xs font-normal">{getDayDate(4)}</div>
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      <div>SAT</div>
                      <div className="text-xs font-normal">{getDayDate(5)}</div>
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      <div>SUN</div>
                      <div className="text-xs font-normal">{getDayDate(6)}</div>
                    </th>
                    <th className="border border-border bg-muted p-2 text-center font-semibold">
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {timesheet.timesheet_entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="border border-border p-2">{entry.project}</td>
                      <td className="border border-border p-2">{entry.task}</td>
                      <td className="border border-border p-2 text-center">
                        {entry.mon_hours}
                      </td>
                      <td className="border border-border p-2 text-center">
                        {entry.tue_hours}
                      </td>
                      <td className="border border-border p-2 text-center">
                        {entry.wed_hours}
                      </td>
                      <td className="border border-border p-2 text-center">
                        {entry.thu_hours}
                      </td>
                      <td className="border border-border p-2 text-center">
                        {entry.fri_hours}
                      </td>
                      <td className="border border-border p-2 text-center">
                        {entry.sat_hours}
                      </td>
                      <td className="border border-border p-2 text-center">
                        {entry.sun_hours}
                      </td>
                      <td className="border border-border p-2 text-center font-semibold">
                        {formatHours(calculateTotal(entry))}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted font-semibold">
                    <td colSpan={2} className="border border-border p-2 text-right">
                      TOTAL
                    </td>
                    {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => (
                      <td key={day} className="border border-border p-2 text-center">
                        {formatHours(calculateDayTotal(`${day}_hours` as keyof TimesheetEntry))}
                      </td>
                    ))}
                    <td className="border border-border p-2 text-center">
                      {formatHours(calculateGrandTotal())}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              <p>*Record all time to the nearest 10th of an hour</p>
              <p>*Overtime is not authorized without Customer Management Approval</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SharedTimesheet;

