param(
    [string]$ArchitectureDir = (Join-Path $PSScriptRoot '..\docs\architecture')
)

$ErrorActionPreference = 'Stop'

$files = Get-ChildItem $ArchitectureDir -Filter '*.drawio' -File |
    Where-Object { $_.Name -match '^(?:0[1-9]|10)-' } |
    Sort-Object Name

function Get-StyleValue([string]$Style, [string]$Key, [double]$Default)
{
    $match = [regex]::Match($Style, '(?:^|;)' + [regex]::Escape($Key) + '=([^;]+)')

    if (-not $match.Success)
    {
        return $Default
    }

    $value = 0.0
    $parsed = [double]::TryParse(
        $match.Groups[1].Value,
        [Globalization.NumberStyles]::Float,
        [Globalization.CultureInfo]::InvariantCulture,
        [ref]$value)

    return $(if ($parsed) { $value } else { $Default })
}

function New-Point($X, $Y)
{
    [PSCustomObject]@{ X = [double]$X; Y = [double]$Y }
}

function Test-LineIntersectsRectangle($A, $B, $Rectangle)
{
    $epsilon = 2.0
    $x1 = [double]$Rectangle.x - $epsilon
    $y1 = [double]$Rectangle.y - $epsilon
    $x2 = [double]$Rectangle.x + [double]$Rectangle.width + $epsilon
    $y2 = [double]$Rectangle.y + [double]$Rectangle.height + $epsilon

    if ([math]::Abs($A.X - $B.X) -lt 0.5)
    {
        if ($A.X -lt $x1 -or $A.X -gt $x2) { return $false }
        $low = [math]::Min($A.Y, $B.Y)
        $high = [math]::Max($A.Y, $B.Y)
        return $high -ge $y1 -and $low -le $y2
    }

    if ([math]::Abs($A.Y - $B.Y) -lt 0.5)
    {
        if ($A.Y -lt $y1 -or $A.Y -gt $y2) { return $false }
        $low = [math]::Min($A.X, $B.X)
        $high = [math]::Max($A.X, $B.X)
        return $high -ge $x1 -and $low -le $x2
    }

    for ($i = 0; $i -le 100; $i++)
    {
        $ratio = $i / 100.0
        $x = $A.X + ($B.X - $A.X) * $ratio
        $y = $A.Y + ($B.Y - $A.Y) * $ratio

        if ($x -ge $x1 -and $x -le $x2 -and $y -ge $y1 -and $y -le $y2)
        {
            return $true
        }
    }

    return $false
}

$issues = @()

foreach ($file in $files)
{
    [xml]$document = Get-Content $file.FullName -Raw
    $vertices = @{}

    foreach ($cell in $document.SelectNodes('//mxCell[@vertex="1"]'))
    {
        $geometry = $cell.mxGeometry
        if (-not $geometry) { continue }

        $vertices[$cell.id] = [PSCustomObject]@{
            id = $cell.id
            x = [double]$geometry.x
            y = [double]$geometry.y
            width = [double]$geometry.width
            height = [double]$geometry.height
            style = [string]$cell.style
            value = [string]$cell.value
        }
    }

    $texts = @($vertices.Values | Where-Object { $_.style -match '^text;' })
    $boxes = @(
        $vertices.Values | Where-Object {
            $_.style -notmatch '^text;' -and
            $_.style -notmatch 'fillOpacity=' -and
            -not [string]::IsNullOrWhiteSpace($_.value)
        }
    )
    $segments = @()

    foreach ($edge in $document.SelectNodes('//mxCell[@edge="1"]'))
    {
        $source = $vertices[[string]$edge.source]
        $target = $vertices[[string]$edge.target]
        if (-not $source -or -not $target) { continue }

        $style = [string]$edge.style
        $exitX = Get-StyleValue $style 'exitX' 0.5
        $exitY = Get-StyleValue $style 'exitY' 0.5
        $entryX = Get-StyleValue $style 'entryX' 0.5
        $entryY = Get-StyleValue $style 'entryY' 0.5

        $points = @()
        $points += New-Point ($source.x + $source.width * $exitX) ($source.y + $source.height * $exitY)

        $array = $edge.mxGeometry.Array
        if ($array)
        {
            foreach ($point in $array.mxPoint)
            {
                $points += New-Point ([double]$point.x) ([double]$point.y)
            }
        }

        $points += New-Point ($target.x + $target.width * $entryX) ($target.y + $target.height * $entryY)

        for ($i = 0; $i -lt $points.Count - 1; $i++)
        {
            $a = $points[$i]
            $b = $points[$i + 1]
            $segments += [PSCustomObject]@{
                edge = [string]$edge.id
                a = $a
                b = $b
            }

            if ([math]::Abs($a.X - $b.X) -gt 0.5 -and [math]::Abs($a.Y - $b.Y) -gt 0.5)
            {
                $issues += ('{0} | DIAGONAL | edge={1}' -f $file.Name, $edge.id)
            }

            foreach ($textCell in $texts)
            {
                if (-not (Test-LineIntersectsRectangle $a $b $textCell)) { continue }

                $label = [regex]::Replace($textCell.value, '<[^>]+>', ' ')
                $label = $label -replace '&[^;]+;', ' '
                $label = ($label -replace '\s+', ' ').Trim()
                if ($label.Length -gt 50) { $label = $label.Substring(0, 50) }

                $issues += ('{0} | TEXT_INTERSECTION | edge={1} | text={2} [{3}]' -f $file.Name, $edge.id, $textCell.id, $label)
            }

            foreach ($boxCell in $boxes)
            {
                if ($boxCell.id -eq [string]$edge.source -or $boxCell.id -eq [string]$edge.target) { continue }
                if (-not (Test-LineIntersectsRectangle $a $b $boxCell)) { continue }

                $boxLabel = [regex]::Replace($boxCell.value, '<[^>]+>', ' ')
                $boxLabel = $boxLabel -replace '&[^;]+;', ' '
                $boxLabel = ($boxLabel -replace '\s+', ' ').Trim()
                if ($boxLabel.Length -gt 40) { $boxLabel = $boxLabel.Substring(0, 40) }

                $issues += ('{0} | BOX_INTERSECTION | edge={1} | box={2} [{3}]' -f $file.Name, $edge.id, $boxCell.id, $boxLabel)
            }
        }
    }

    $margin = 3.0
    for ($left = 0; $left -lt $segments.Count; $left++)
    {
        for ($right = $left + 1; $right -lt $segments.Count; $right++)
        {
            $s1 = $segments[$left]
            $s2 = $segments[$right]
            if ($s1.edge -eq $s2.edge) { continue }

            $s1Vertical = [math]::Abs($s1.a.X - $s1.b.X) -lt 0.5
            $s1Horizontal = [math]::Abs($s1.a.Y - $s1.b.Y) -lt 0.5
            $s2Vertical = [math]::Abs($s2.a.X - $s2.b.X) -lt 0.5
            $s2Horizontal = [math]::Abs($s2.a.Y - $s2.b.Y) -lt 0.5

            if ($s1Horizontal -and $s2Vertical)
            {
                $x = $s2.a.X
                $y = $s1.a.Y
                $inside1 = $x -gt ([math]::Min($s1.a.X, $s1.b.X) + $margin) -and $x -lt ([math]::Max($s1.a.X, $s1.b.X) - $margin)
                $inside2 = $y -gt ([math]::Min($s2.a.Y, $s2.b.Y) + $margin) -and $y -lt ([math]::Max($s2.a.Y, $s2.b.Y) - $margin)
                if ($inside1 -and $inside2)
                {
                    $issues += ('{0} | CONNECTOR_CROSSING | edge={1} x edge={2}' -f $file.Name, $s1.edge, $s2.edge)
                }
            }
            elseif ($s1Vertical -and $s2Horizontal)
            {
                $x = $s1.a.X
                $y = $s2.a.Y
                $inside1 = $y -gt ([math]::Min($s1.a.Y, $s1.b.Y) + $margin) -and $y -lt ([math]::Max($s1.a.Y, $s1.b.Y) - $margin)
                $inside2 = $x -gt ([math]::Min($s2.a.X, $s2.b.X) + $margin) -and $x -lt ([math]::Max($s2.a.X, $s2.b.X) - $margin)
                if ($inside1 -and $inside2)
                {
                    $issues += ('{0} | CONNECTOR_CROSSING | edge={1} x edge={2}' -f $file.Name, $s1.edge, $s2.edge)
                }
            }
            elseif ($s1Horizontal -and $s2Horizontal -and [math]::Abs($s1.a.Y - $s2.a.Y) -lt 0.5)
            {
                $overlap = [math]::Min([math]::Max($s1.a.X, $s1.b.X), [math]::Max($s2.a.X, $s2.b.X)) -
                           [math]::Max([math]::Min($s1.a.X, $s1.b.X), [math]::Min($s2.a.X, $s2.b.X))
                if ($overlap -gt ($margin * 2))
                {
                    $issues += ('{0} | CONNECTOR_OVERLAP | edge={1} x edge={2}' -f $file.Name, $s1.edge, $s2.edge)
                }
            }
            elseif ($s1Vertical -and $s2Vertical -and [math]::Abs($s1.a.X - $s2.a.X) -lt 0.5)
            {
                $overlap = [math]::Min([math]::Max($s1.a.Y, $s1.b.Y), [math]::Max($s2.a.Y, $s2.b.Y)) -
                           [math]::Max([math]::Min($s1.a.Y, $s1.b.Y), [math]::Min($s2.a.Y, $s2.b.Y))
                if ($overlap -gt ($margin * 2))
                {
                    $issues += ('{0} | CONNECTOR_OVERLAP | edge={1} x edge={2}' -f $file.Name, $s1.edge, $s2.edge)
                }
            }
        }
    }
}

if ($issues.Count -gt 0)
{
    $issues | Sort-Object -Unique | Write-Host
    throw "Architecture geometry lint failed with $($issues.Count) issue(s)."
}

Write-Host 'GEOMETRY_LINT=PASS'
