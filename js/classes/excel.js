'use strict';

class ExcelObj extends OfficeObj
{
    constructor( имя_объекта ) {
        super( имя_объекта );
        this.книга_Excel;
        this.sheet;
        this.range;
    }

    // Копирует Шаблон в подкаталог REPORT_OFFICE каталога программы
    // с именем дополнительного параметра, при отсутствии - "out.xls"
    // и создает объект Excel, в котором открывает данный файл
    // Шаблон        - полный путь с именем шаблона.
    // ВыходнойФайл  - имя выходного файла (без пути!!!).
    Create( _шаблон, _выходнойФайл )
    {
        if( !ЕстьФайл(_шаблон, "ч") )
            throw "ReportBreak: Нет шаблона отчета!\n Нужен файл:\n" + _шаблон;

        this.office_obj.DisplayAlerts = false;  /// Фадеичева. Отключение алертов в процессе выполнения функций СТЕК.

        var ВыходнойФайл = this.Каталог_офиса + ((_выходнойФайл != undefined) ? _выходнойФайл : "out" + ИзвлечьРасширениеФайла(_шаблон) );

        ВыходнойФайл = this.УдалитьИПолучитьИмяФайла( ВыходнойФайл, this.cmd_client );
        КопироватьФайл( _шаблон, this.cmd_client + ВыходнойФайл );

        this.книга_Excel  = this.office_obj.Workbooks().Open( ВыходнойФайл, 0, 0, 1, "450194" );
    }

    // Присвоение значения именованной ячейке активного листа
    Cell0( _Ячейка, _Значение )
    {
        this.книга_Excel.ActiveSheet().Range( _Ячейка ).Value = _Значение;
    }

    // Присвоение значения именованной ячейке указанного листа
    cell( _Лист, _Ячейка, _Значение )
    {
        this.книга_Excel.Sheets( _Лист ).Range( _Ячейка ).Value = _Значение;

        // todo
        /*if( Есть(Параметры[1]) )
            Internal_Excel_Set_Attributes( Параметры[1] );*/
    }

    // Копирует заданную область одного листа в другой в указанные координаты
    //  _ЛистИсточник  - откуда копировать
    //  _ЛистВставки   - куда копировать
    //
    Copy( _ЛистИсточник, _ЛСтрока, _ЛСтолбец, _ПСтрока, _ПСтолбец, _ЛистВставки,  _СтрокаПриемник, _СтолбецПриемник )
    {
        var names = this.книга_Excel.Sheets( _ЛистИсточник );
        names = names.Range( names.Cells.Item(_ЛСтрока, _ЛСтолбец), names.Cells.Item(_ПСтрока, _ПСтолбец) );
        names.Copy;
        var dst_names = this.книга_Excel.Sheets( _ЛистВставки );
        var cell3 = dst_names.Cells.Item( _СтрокаПриемник, _СтолбецПриемник );
        cell3.PasteSpecial();
    }

    Sheets( _sheet )
    {
        this.sheet = this.книга_Excel.Sheets( _sheet );
    }

    SheetRange( _range )
    {
        if( this.sheet != undefined )
            this.range = this.sheet.Range( _range );
    }

    RangeDelete( _rangeDelete )
    {
        if( this.range != undefined )
            this.range.Delete( _rangeDelete );
    }

    // функция-заглушка для возможности задания пользовательских режимов
    Клиент_Internal_Excel_Set_Attributes( режимы )
    {
    }

    // Внутренняя функция - установка атрибутов области names в соответствии со строкой режимы
    Internal_Excel_Set_Attributes( режимы, _names )
    {
        if( режимы.indexOf("Ж") > -1 )
            _names.Font.Bold = -1;
        if( режимы.indexOf("К") > -1 )
            _names.Font.Italic = -1;
        if( режимы.indexOf("г") > -1 )
        {
            var грань = _names.Borders(7);  // внешняя левая
            грань.LineStyle = 1;
            грань.Weight = 2;
            грань = _names.Borders(8);        // внешняя верхняя
            грань.LineStyle = 1;
            грань.Weight = 2;
            грань = _names.Borders(9);        // внешняя нижняя
            грань.LineStyle = 1;
            грань.Weight = 2;
            грань = _names.Borders(10);       // внеяшняя правая
            грань.LineStyle = 1;
            грань.Weight = 2;
            грань = _names.Borders(11);       // внутренняя вертикальная
            грань.LineStyle = 1;
            грань.Weight = 2;
            грань = _names.Borders(12);       // внутренняя горизонтальная
            грань.LineStyle = 1;
            грань.Weight = 2;
        }
        if( режимы.indexOf("Г") > -1 )
        {
            var грань = _names.Borders(7);  // внешняя левая
            грань.LineStyle = 1;
            грань.Weight = 3;
            грань = _names.Borders(8);        // внешняя верхняя
            грань.LineStyle = 1;
            грань.Weight = 3;
            грань = _names.Borders(9);        // внешняя нижняя
            грань.LineStyle = 1;
            грань.Weight = 3;
            грань = _names.Borders(10);       // внешняя правая
            грань.LineStyle = 1;
            грань.Weight = 3;
        }
        if( режимы.indexOf("Цс") > -1 )
        {
            _names.Interior.ColorIndex = 34;
            _names.Interior.Pattern = 1;
        }
        if( режимы.indexOf("Цж") > -1 )
        {
            _names.Interior.ColorIndex = 6;
            _names.Interior.Pattern = 1;
        }
        if( режимы.indexOf("ПоЦентру") > -1 )
            _names.HorizontalAlignment = -4108;

        this.Клиент_Internal_Excel_Set_Attributes( режимы );
    }

    // Выгружает двумерный массив _мЭксель, оба индекса которого начинаются с 0, в ранее созданный вызовом Excel_Create объект Exсel
    // на страницу с именем _Лист в прямоугольник, левый верний угол которого _ЛСтрока, _ЛСтолбец,
    // а правый нижний определяется максимальными индексами в массиве
    //
    // Дополнительный параметр - строка символов:
    // если в строке содержится символ  Ж  - текст в ячейках прямоугольника выводится жирным,
    // символ  К  - курсивом
    // символ  г  - проводятся границы (вокруг прямоугольника и внутри него) тонкими линиями
    // символ  Г  - проводятся внешние границы (вокруг прямоугольника) толстыми линиями
    // символы Цс - ячейкам прямоугольника дается бирюзовый фон
    // символы Цж - ячейкам прямоугольника дается желтый фон
    Data( _Лист, _ЛСтрока, _ЛСтолбец, _мЭксель, _строкаСимволов )
    {
        var _Длина  = 0;
        var _Ширина = 0;
        var _мЭксельПустой = true;
        for( let _инд in _мЭксель )
        {
            if( !_мЭксель.hasOwnProperty(_инд) ) continue;
            for( let _минд in _мЭксель[_инд] )
            {
                if( !_мЭксель[_инд].hasOwnProperty(_минд) ) continue;
                if( _Ширина < Number(_минд) ) {
                    _Ширина = Number( _минд );
                }
            }
            if( _Длина < Number(_инд) ) {
                _Длина = Number( _инд );
            }
            _мЭксельПустой = false;
        }
        if( _мЭксельПустой )
            return 0;

        var names = this.книга_Excel.Sheets( _Лист );
        names = names.Range( names.Cells().Item(_ЛСтрока, _ЛСтолбец), names.Cells().Item(_ЛСтрока + _Длина, _ЛСтолбец + _Ширина) );
        names.Value = _мЭксель;

        if( _строкаСимволов != undefined )
            this.Internal_Excel_Set_Attributes( _строкаСимволов, names );
    }

    // Сохраняет Excel файл, закрывает наше окно отчета,  освобождает созданный Excel_Create объект Excel
    // Если  Visible = 1 - файл-результат будет выведен на экран, 0 - не будет
    // Дополнительные аргументы:
    // число - не нужно закрывать окно стандарного отчета,
    // строка - имя, под которым сохранять файл (иначе сохраняется под тем же именем, которое было аргументом ВыходнойФайл  в Excel_Create)
    Close( _Visible )
    {
        var _ЗакрытьОкно = 1;
        var _Имя_файла  = "";

        //todo для чего arguments[1] и arguments[2]????
        var ind=1;
        while( ind <= 2 )
        {
            if( arguments[ind] != undefined )
            {
                if( typeof(arguments[ind]) == "Number" )
                    _ЗакрытьОкно = 0;
                if( typeof(arguments[ind]) == "String" )
                    _Имя_файла = arguments[ind];
            }
            ind++;
        }

        if( this.книга_Excel != undefined ) {
            if( _Имя_файла != "" ) {
                _Имя_файла = this.УдалитьИПолучитьИмяФайла( _Имя_файла, this.cmd_client );

                if( Number( this.office_obj.Version ) >= 12 && ИзвлечьРасширениеФайла( _Имя_файла ) == ".xls" )
                    this.книга_Excel.SaveAs( _Имя_файла, 56 );
                else
                    this.книга_Excel.SaveAs( _Имя_файла );
            }
            else {
                this.книга_Excel.Save();
                _Имя_файла = this.книга_Excel.FullName();
            }
        }
        this.office_obj.Quit();

        if( _Visible && _Имя_файла != "" )
            this.ЗапуститьФайлOffice( 0, _Имя_файла );
    }
}

class ВыборкаВТаблицуExcel
{
    constructor() {
        this.table_data;        //Из exe
    }

    ВыгрузитьВыборкуВТаблицуExcel( номерСтроки, числоПолей, типыСтолбцов )
    {
        var excel = new ExcelObj( "Excel" );
        var excelWorkbooks = excel.office_obj.Workbooks().Add();
        var excelActiveSheet = excelWorkbooks.ActiveSheet();
        var excelCellBegin = excelActiveSheet.Cells( 1, 1 );                          // все строки с выравниванием вправо
        var excelCellEnd = excelActiveSheet.Cells( номерСтроки, числоПолей );
        var names = excelActiveSheet.Range( excelCellBegin, excelCellEnd );
        names.VerticalAlignment = -4160;                /* top */
        names.HorizontalAlignment = -4152;

        for( var i in типыСтолбцов )
        {
            var namesCurrent = excelActiveSheet.Columns().Item(i);
            switch( типыСтолбцов[i] )
            {
                case "Текст":
                    namesCurrent.NumberFormat = "@";
                    namesCurrent.ColumnWidth = 51;
                    namesCurrent.WrapText = 1;
                    namesCurrent.HorizontalAlignment = -4131;  /* left */
                    break;
                case "Деньги":
                    namesCurrent.NumberFormat = "# ##0.00;";
                    break;
                case "Вещественное число":
                    namesCurrent.NumberFormat = "# ##0.#;";
                    break;
                case "Целое число":
                    namesCurrent.NumberFormat = "# ##;";
                    break;
            }
        }

        names = excelActiveSheet.Range( excelCellBegin, excelCellEnd );
        names.Value = this.table_data;
        names.Columns().AutoFit();
        var excelRows = excelActiveSheet.Rows();
        names = excelRows.Item( 2 );
        names.HorizontalAlignment = -4108;      /* center */
        names.font.bold = 1;
        names = excelRows.Item( номерСтроки );
        var excelInterior = names.Interior();
        excelInterior.ColorIndex = 6;
        excelInterior.Pattern = 1;
        names = excelActiveSheet.Range( excelActiveSheet.Cells( 2, 1 ), excelCellEnd );
        var borders = names.Borders();
        borders.LineStyle = 1;              /* xlContinuous */
        borders.Weight = 2;                 /* xlThin */
        borders.ColorIndex = -4105;         /* xlAutomatic */
        var pageSetup=excelActiveSheet.PageSetup();
        pageSetup.Orientation = 2;                     /*landscape*/
        pageSetup.Zoom = false;
        pageSetup.FitToPagesWide = 1;
        pageSetup.FitToPagesTall = 1000;

        names = excelRows.Item( 1 );              // первая и вторая строки - выравнивание по центру
        names.HorizontalAlignment = -4108;      /* center */
        var font = names.font();
        font.bold = 1;
        names = excelRows.Item( 2 );
        names.HorizontalAlignment = -4108;
        font.bold = 1;

        excel.ЗапуститьФайлOffice( excelWorkbooks, excel.Каталог_офиса + "out.xls" );
    }
}