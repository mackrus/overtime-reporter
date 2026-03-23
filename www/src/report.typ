#let report(
  title: "",
  date: "",
  salary_label: "",
  salary_value: "",
  full_month_salary: "",
  ref_label: "",
  ref_value: "",
  headers: (),
  rows: (),
  totals: (),
  c_simple_rate: "",
  c_qual_rate: "",
  c_simple_h: "",
  c_simple_sek: "",
  c_qual_h: "",
  c_qual_sek: "",
  c_gross: "",
  c_vacation: "",
  c_total: "",
  footer_text: "",
) = {
  set document(title: title)

  set page(paper: "a4", margin: (x: 2.5cm, y: 3cm), footer: none)

  set text(font: "New Computer Modern", size: 10.5pt)
  set par(justify: true, leading: 0.6em)
  set heading(numbering: none)

  align(center)[
    #text(16pt, weight: "bold")[#title] \
    #v(0.4em)
    #text(10.5pt)[#date]
  ]

  v(0.8cm)

  align(center)[
    #grid(
      columns: (auto, auto),
      gutter: 4cm,
      [*#salary_label:* #salary_value SEK], [*#ref_label:* #ref_value],
    )
  ]

  v(1cm)

  heading[Registrerad Övertid]
  v(0.5em)

  align(center)[
    #table(
      columns: (auto, auto, auto, 1fr, auto),
      align: (left, right, left, left, right),
      stroke: none,
      inset: 5pt,

      table.hline(stroke: 1pt),
      ..headers.map(h => [*#h*]),
      table.hline(stroke: 0.5pt),

      ..rows.flatten(),

      table.hline(stroke: 1pt),
    )
  ]

  v(1cm)

  heading[Ekonomisk Sammanställning]
  v(0.5em)

  align(center)[
    #block(width: 85%)[
      #table(
        columns: (1fr, auto),
        align: (left, right),
        stroke: none,
        inset: 5pt,
        ..totals.flatten()
      )
    ]
  ]

  v(1cm)

  heading[Beräkningsmodell]
  v(0.5em)

  [
    Ersättningen utgår från en månadslön (heltidslön) på #full_month_salary SEK. Timersättningen beräknas enligt lagstadgade nyckeltal:

    $
      R_"enkel" & = #full_month_salary / 94 = #c_simple_rate "kr/h" \
       R_"kval" & = #full_month_salary / 72 = #c_qual_rate "kr/h"
    $

    Utifrån de registrerade timmarna framräknas bruttolönen före semesterersättning:

    $
      G & = (#c_simple_h "h" dot R_"enkel") + (#c_qual_h "h" dot R_"kval") \
        & = #c_simple_sek + #c_qual_sek = #c_gross "SEK"
    $

    Slutligen adderas lagstadgad semesterersättning (12 % av bruttosumman):

    $
      T & = G dot 1.12                              \
        & = #c_gross + #c_vacation = #c_total "SEK"
    $
  ]

  v(1fr)

  align(center)[
    #line(length: 40%, stroke: 0.5pt)
    #v(0.2em)
    #text(8pt, style: "italic")[#footer_text]
  ]
}
