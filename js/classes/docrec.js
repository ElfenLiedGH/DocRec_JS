"use strict";
/**
 * Класс контроля версии ДО, содержит методы, необходимые для перехода между версиями ДО
 * @class кДОконтрольВерсии
 */
class кДОконтрольВерсии{
    constructor(){
        // ROW_ID с записью с номеров версии в таблице [ДО карточки]
        this.нзВерсии = -1;
        // Номер версии ДО в базе
        this.ВерсияДокументооборота;
    }
    static ЗапуститьПроверкуВерсии(){
        if( Задача() != "Документооборот" ) return -1;
        var ДОконтроль = new кДОконтрольВерсии();
        ДОконтроль.ПроверитьВерсию();
        try{
            ДОконтроль.АктуализироватьВерсию();
        }
        catch( er ){
            Сообщить( "Невозможно обновить версию, необходимо повторить с правами администратора.\n" + er.message  );
        }
    }
    // Содержит текущую версию ДО, до которой необходимо обновление
    get ТекущаяВерсия() {
        return 2;
    }

    /**
     * Поиск текущей версии ДО в базе
     */
    ПроверитьВерсию(){
        this.ВерсияДокументооборота = 1;
        var зПроверкаВерсии = Query(
            ` SELECT TOP 1 Номер, ROW_ID
                FROM ~ДО карточки~
                WHERE [Дата создания] = '19991111' `, 1, "" );
        зПроверкаВерсии.УстановитьПараметры();
        while( зПроверкаВерсии.Следующий() ) {
            this.ВерсияДокументооборота = зПроверкаВерсии.Номер;
            this.нзВерсии = зПроверкаВерсии.ROW_ID;
        }
    }

    /**
     * Проставляет текущую версию задачи в базу
     * @returns {boolean}
     */
    ОбновитьДанныеПоВерсии(){
        if( this.нзВерсии == -1 ){
            var оДОкарточки = Объект( "ДО карточки" );
            оДОкарточки['Номер'] = this.ТекущаяВерсия;
            оДОкарточки['Дата'] = new Date( 1999, 11, 11 );
            this.нзВерсии = ВнестиЗапись( оДОкарточки );
            return true;
        }
        var кОбновитьДанные = Command( ` UPDATE ~ДО карточки~ SET Номер = :1 WHERE ROW_ID = :2 `, 1, "num,A,rID,S" );
        кОбновитьДанные.Выполнить( this.ТекущаяВерсия, this.нзВерсии );
        кОбновитьДанные.Завершить();
        return true;
    }
    /**
     * Выполнение необходимых процедур для актуализаци версии, если это необходимо
     */
    АктуализироватьВерсию(){
        if( !this.ВерсияДокументооборота ) throw  new StackError( "Версия ДО неопределена." );
        if( this.ВерсияДокументооборота >= this.ТекущаяВерсия ) return true;
        switch( this.ВерсияДокументооборота ){
            case 1:{
                кДОконтрольВерсии.ОбновлениеТаблицДляВерсии1();
                break;
            }
        }
        this.ОбновитьДанныеПоВерсии();
    }
    // Конвертация полей таблиц ДО из image в varchar( max )
    static ОбновлениеТаблицДляВерсии1(){
        кДОконтрольВерсии.ОбновлениеТаблицДляВерсии1_КонвертацияСтолбцаТаблицы( "ДО задания", "Отметки" );
        кДОконтрольВерсии.ОбновлениеТаблицДляВерсии1_КонвертацияСтолбцаТаблицы( "ДО задания шаблон", "Отметки" );
        кДОконтрольВерсии.ОбновлениеТаблицДляВерсии1_КонвертацияСтолбцаТаблицы( "ДО заметки", "Заметка" );
        кДОконтрольВерсии.ОбновлениеТаблицДляВерсии1_КонвертацияСтолбцаТаблицы( "ДО переходы", "Исходный текст" );
        кДОконтрольВерсии.ОбновлениеТаблицДляВерсии1_КонвертацияСтолбцаТаблицы( "ДО часы", "Примечание" );
        кДОконтрольВерсии.ОбновлениеЭлектроннойПочты();
        кДОконтрольВерсии.ОбновлениеДокументооборота_ДеровоДокументов();
    }
    static ОбновлениеТаблицДляВерсии1_КонвертацияСтолбцаТаблицы( ИмяТаблицы, ИмяСтолбца ){
        var СозданиеСтолбца = `   ALTER TABLE ~` + ИмяТаблицы + `~ ADD [` + ИмяСтолбца + `1] VARCHAR(max) NULL `;
        var СоздатьСтолбец = Command( СозданиеСтолбца, 1, "" );
        СоздатьСтолбец.Выполнить();
        СоздатьСтолбец.Завершить();
        var ДанныеТаблицы = BufferedReader( ` SELECT [` + ИмяСтолбца + `], ROW_ID FROM ~` + ИмяТаблицы + `~ `, 500, "" );
        var СтрокаЗапроса = ` UPDATE ~` + ИмяТаблицы + `~ SET [` + ИмяСтолбца+ `1] = :1 WHERE ROW_ID = :2 `;
        var ЗаписатьВременныйСтолбец = Command( СтрокаЗапроса , 500, "text,A,rID,S" );
        var Счетчик = 0;
        ДанныеТаблицы.УстановитьПараметры();
        var ВсегоСтрок = ДанныеТаблицы.Количество();
        while( ДанныеТаблицы.Следующий() ){
            if( Счетчик++ % 100 == 0 ) ВывестиСтатус( "Обработано строк в таблице " + ИмяТаблицы + " " + Счетчик + " из " + ВсегоСтрок );
            ЗаписатьВременныйСтолбец.Выполнить( ДанныеТаблицы.ПолеВТекст( ИмяСтолбца ), ДанныеТаблицы.ROW_ID );
        }
        ЗаписатьВременныйСтолбец.Завершить();
        var УдалитьСтолбец = Command( ` ALTER TABLE ~` + ИмяТаблицы + `~ DROP COLUMN [` + ИмяСтолбца+ `]`, 1, "" );
        УдалитьСтолбец.Выполнить();
        УдалитьСтолбец.Завершить();
        var ТекстЗапроса =  ` sp_rename 'stack.[` + ИмяТаблицы + `].[` + ИмяСтолбца + `1]', '` + [ИмяСтолбца] + `', 'COLUMN'; `;
        var ПереименоватьСтолбец = Command( ТекстЗапроса, 1, "" );
        ПереименоватьСтолбец.Выполнить();
        ПереименоватьСтолбец.Завершить();
    }
    static ОбновлениеЭлектроннойПочты(){
        var комманд = Command( 'ALTER TABLE stack.[Сообщения Вложения] ADD Тип int NULL;', 1 );
        комманд.Выполнить();
        комманд.Завершить();

        комманд = Command( "UPDATE stack.[Сообщения Вложения] set Тип=0 --file \
        where Сообщение=0; \
        UPDATE stack.[Сообщения Вложения] set Тип=1 --source \
        where Сообщение=2; \
        UPDATE stack.[Сообщения Вложения] set Тип=3 --plain \
        where Сообщение=1 and (isnull(ТипФайла,'')='' or ТипФайла='plain'); \
        UPDATE stack.[Сообщения Вложения] set Тип=4 --html \
        where Сообщение=1 and ТипФайла='html'; \
        update stack.[Сообщения Заголовок] set Признаки=0 \
        where Папка=-10 and Папка_ADD=0;", 1 );
        комманд.Выполнить();
        комманд.Завершить();
    }
    static ОбновлениеДокументооборота_ДеровоДокументов(){
        var комманд = Command( "UPDATE stack.[ДО категории карточек] set [Диалог создания]='ДО карточки Этап' \
        where [Название] like 'Этап'; \
        UPDATE stack.[ДО категории карточек] set [Диалог создания]='ДО карточки Проект' \
        where [Название] like ' Проект'", 1 );
        комманд.Выполнить();
        комманд.Завершить();
    }
}
//кДОконтрольВерсии.ЗапуститьПроверкуВерсии();
/**
 * @class кWinHttp Класс работы с объектом WinHttp.WinHttpRequest
 */
class кWinHttp{
    /**
     * Если объект не удалось создать, представитель this.Результат, примет значение с текстом ошибки
     * @param {string} Запрос текст запроса по умолчанию
     */
    constructor( Запрос ){
        /**
         * Текст запроса
         * @type {string}
         */
        this.Запрос = Запрос;
        /**
         * Имя используемой библиотеки, по умолчанию WinHttp.WinHttpRequest.5.1
         * @type {string}
         */
        this.ИмяБиблиотеки = "WinHttp.WinHttpRequest.5.1";
        /**
         * Объект WinHttp.WinHttpRequest
         * @type {object}
         */
        this.WinHttpRequest;
        /**
         * Метод отправки запрсоа;
         * @type {string}
         */
        this.Метод = "GET";
        this.Результат = '';
    }
    СоздатьОбъект(){
        this.WinHttpRequest = ВнешнийОбъект( this.ИмяБиблиотеки );
        if( !this.WinHttpRequest  ){
            throw new StackError( 'Не удалось создать объект ' + this.ИмяБиблиотеки );
        }
    }
    /**
     * Отправка и выполнение запрос, содержащегося в представителе this.Запрос
     * @param Запрос переопределение представителя this.Запрос
     * @param метод метод отправки запроса, если отличный от по умолчанию ( "GET" );
     * @returns {string|string|*} результат отправки запроса, либо ошибка
     */
    ОтправитьЗапрос( Запрос, метод ){
        if( Запрос ){
            this.Запрос = Запрос;
        }
        if( !this.Запрос ) {
            throw new StackError( 'Не указан запрос' );
        }
        if( !this.WinHttpRequest ){
            this.СоздатьОбъект();
        }
        try{
            this.WinHttpRequest.Open( метод ? метод : this.Метод, this.Запрос, 0 );
            this.WinHttpRequest.Send();
            this.Результат = this.WinHttpRequest.ResponseText();
        }
        catch( e ){
            throw e;
        }
        return this.Результат;
    }

    /**
     * Возвращает результат выполнения последнего запроса, либо текст ошибки
     * @returns {string|string|*|string}
     */
    ПоследнийОтвет(){
        return this.Результат;
    }
}
/**
 * Класс для работы с FTP
 * @class кСтекFTP
 * @extends БазовыйОбъект
 */
class кСтекFTP extends БазовыйОбъект{

    constructor(){
        super( "ДО FTP аккаунты" );
       /**
        * Имя локального сервера ftp.stack-it.ru
        * @type {string}
        */
        this.ЛокальныйСервер = ПрочитатьКонстанту( new Date(), "ЛОКСЕРВFTP" );
        /**
        * Адрес сервера в локальной сети, Пр.: 192.168.1.1
        * @type {string}
        */
        this.ЛокальныйАдрес = ПрочитатьКонстанту( new Date(), "ЛОКАЛЬНЫЙFTP" );
        /**
         * Экземпляр кWinHttp, инициализируется только при первом обращении
         * @type {кWinHttp}
         */
        this.WinHTTP;
        /**
         * ftp Сервер, подставляемый в окно при создании по умолчанию
         * @type {string}
         */
        this.СерверПоУмолчанию = "ftp.stack-it.ru";
        /**
         * полрт ftp Сервера, подставляемый в окно при создании по умолчанию
         * @type {number}
         */
        this.ПортПоУмолчанию = 21;
    }

    /**
     * Проверяет корректность заполненности полей для работы с FTP
     * Желательно более детально, пока так
     */
    ПроверитьКорректностьПолей(){
        if( !this.Логин || !this.Пароль || !this.Сервер || !this.ЛокальныйСервер ){
            throw new StackError( 'Не указан запрос', 10 );
        }
    }

    /**
     * Возвращает строку адреса ftp сервера в виде ftp://login:pasword@server.ru:port
     * если порт стандартный, то он опускается
     * @returns {string}
     */
    ПолучитьСтрокуАдреса(){
        var пСтрокаАдреса = "ftp://" + this.Объект.Логин + ":" + this.Объект.Пароль + "@" + this.Объект.Сервер;
        if( this.Объект.Порт != 21 && this.Объект.Порт ) пСтрокаАдреса += ":" +this.Объект.Порт;
        return пСтрокаАдреса;
    }

    /**
     * Возвращает строку адреса ftp сервера в виде ftp://login:pasword@network:port
     * если порт стандартный, то он опускается
     * @returns {string}
     */
    ПолучитьСтрокуАдресаЛокально(){
       // Если сервер расположен в нашей сети, заменим адрес на внутренний
       var Сервер = this.Объект.Сервер;
       if( this.Объект.Сервер.toLowerCase().indexOf( this.ЛокальныйСервер ) != -1  ){
            Сервер = this.ЛокальныйАдрес;
       }
       var пСтрокаАдреса = "ftp://" + this.Объект.Логин + ":" + this.Объект.Пароль + "@" + Сервер;
       if( this.Объект.Порт != 21 && this.Объект.Порт ) пСтрокаАдреса += ":" +this.Объект.Порт;
       return пСтрокаАдреса;
    }

    /**
     * Открывает папку FTP сервера в explorer
     */
    ОткрытьПапку(){
        Запустить( "CLIENT:explorer.exe " + this.ПолучитьСтрокуАдресаЛокально());
    }

    /**
     * Создает папку на FTP Сервере
     * @param ДобавлятьЗаписьВБазу true - если необходимо выполнять внесение новой записи в базу
     */
    СоздатьПапку( ДобавлятьЗаписьВБазу ){
        let СтрокаЗапроса = "http://" + this.ЛокальныйАдрес + "/ftp-service/index.php?username=" + this.Объект.Логин + "&password=" + this.Объект.Пароль + "&task=1";
        if( !this.WinHTTP ) this.WinHTTP = new кWinHttp(СтрокаЗапроса);
        var Результат = +this.WinHTTP.ОтправитьЗапрос();
        switch ( Результат ){
            case 2 : throw new StackError( 'Данный пользователь уже сущестует на сервере' ); break;
            case 3 : throw new StackError( 'Ошибка создания пользователя, попробуйте с другими параметрами.' ); break;
        }
        if( ДобавлятьЗаписьВБазу ) this.Сохранить();
    }

    /**
     * Удаляет папку на FTP Сервере
     * @param УдалятьЗаписьИзБазы true, если надо удалять запись из базы
     */
    УдалитьПапку( УдалятьЗаписьИзБазы ){
        let СтрокаЗапроса = "http://" + this.ЛокальныйАдрес + "/ftp-service/index.php?username=" + this.Объект.Логин + "&password=" + this.Объект.Пароль + "&task=2";
        if( !this.WinHTTP ) this.WinHTTP = new кWinHttp(СтрокаЗапроса);
        if( this.WinHTTP.ОтправитьЗапрос()  == 3 ){
            throw new StackError(  'Ошибка выполнения команды запроса.\nУдаление не выполнено.' );
        }
        if( УдалятьЗаписьИзБазы ) this.Удалить();
    }

    /**
     * Отображает строку адреса в новом окне
     */
    ПоказатьСтрокуАдреса(){
        if( !this.оДлгСтрокаАдреса ) {
            this.оДлгСтрокаАдреса = СоздатьДиалог("ДО FTP строка адреса");
        }
        this.оДлгСтрокаАдреса['@СтрокаАдресаFTP'] = this.ПолучитьСтрокуАдреса();
        this.оДлгСтрокаАдреса.Выполнить();
    }
}
/**
 * СТРУКТУРА ПРОЕКТОВ ЗАГОТОВКА
 */
class кПортфельПроектов{
    constructor(НомерЗаписи){
        this.НомерЗаписи = НомерЗаписи;
    }
    ПолучитьСписокКонтролеров() {
        var зКонтролеры = BufferedReader(`SELECT Row_ID FROM ~ДО контроль~ WHERE [Контроль-Аналитика]=:1`, 100, "S,S");
        var мКонтролеры = [];
        зКонтролеры.УстановитьПараметры(нзАналитик);
        while (зКонтролеры.Следующий()) {
            мКонтролеры[зКонтролеры.Row_ID] = зКонтролеры.Row_ID;
        }
        return мКонтролеры;
    }
}
class кПроект extends кПортфельПроектов{
    constructor(НомерЗаписи){
        super(НомерЗаписи);
    }
}
class кЭтапПроекта extends кПроект{
    constructor(НомерЗаписи){
        super(НомерЗаписи);
    }
}
class кЗаявка extends БазовыйОбъект {
    constructor( параметр ){
        super( 'ДО карточки', -1 );
        /**
         * договор карточки (по хорошому должен быть нормальный класс)
         * @type {кДоговор}
         */
        this.Договор = undefined;
        /**
         * текущая фаза заявки
         * @type {{id: number, Название: string, Исполнитель: string}}
         */
        this.ТекущаяФаза = {'id' : -1,
            'Название' : '',
            'Исполнитель' : '',
            'Работа' : -1,
            'ТипИсполнителя' : 0};
        if( параметр ) this.Прочитать( параметр );
    }
    Прочитать( параметр ){
        var установлено = false;
        if( typeof параметр == 'number' && super.Прочитать(параметр)){
            установлено = true;
        } else if( typeof параметр == 'object' ){
            this.Установить( НомерЗаписи(параметр) );
            if( super.ПрочитатьИзКонтекста( параметр ) ) установлено = true;
        }
        if( установлено ) {
            this.Договор = new кДоговор( this.Объект['Карточка-Договор'], true );
        }
        return установлено;
    }
    ЕстьНепустыеЗадания() {
        var запросРабот = Query(`;WITH sum1 AS (
                               SELECT count(hour.ROW_ID) [cnt]
                               FROM ~ДО Карточки~ card
                                  JOIN ~ДО задания~ task ON task.[Задание-Карточка]=card.ROW_ID
                                  JOIN ~ДО часы~ hour ON hour.[Часы-Задание]=task.ROW_ID
                               WHERE card.ROW_ID=:1
                               UNION
                               SELECT count(task_ch.ROW_ID)
                               FROM ~ДО Карточки~ card
                                  JOIN ~ДО задания~ task ON task.[Задание-Карточка]=card.ROW_ID
                                  JOIN ~ДО задания~ task_ch ON task_ch.[Подзадания]=task.ROW_ID
                               WHERE card.ROW_ID=:2)
                               SELECT SUM([cnt]) cnt
                               FROM sum1`, 1, "id,S,id2,S");
        запросРабот.УстановитьПараметры( this.НомерЗаписи, this.НомерЗаписи );
        запросРабот.Следующий()
        return запросРабот.cnt > 0;
    }

    /**
     * взвращает дату завершения заявки исходя из ее договора
     * если договор указан, то читает параметр 'СРОК_ИСП' с договора + выходные
     * @returns {Date}
     */
    ЗавершитьДо() {
        var завершитьДо = this.Объект['Дата создания'];
        if( this.Договор.НомерЗаписи != -1 ) {
            var зСрокИсполнения = Query( 'SELECT TOP 1 prop.Значение ' +
                'FROM ~Свойства~ prop JOIN ~Виды параметров~ p on prop.[Виды-Параметры]=p.ROW_ID ' +
                "WHERE p.Название LIKE 'срок_исп' AND prop.[Параметры-Договор]=:1 " +
                'ORDER BY prop.ДатНач DESC', 1, "cont,S" );

            зСрокИсполнения.УстановитьПараметры( this.Договор.НомерЗаписи );
            if( зСрокИсполнения.Следующий() ) // указан срок выпонения - берем его
                завершитьДо = new кРабочийКалендарь().ПрибавитьРабочиеДни( завершитьДо, Number(зСрокИсполнения.Значение) );
        }
        return завершитьДо;
    }
    КоличествоРабот(){
        var зРабот = BufferedReader( 'SELECT Count(*) cnt FROM ~ДО задания~ ' +
            'WHERE [Задание-Карточка]=:1 AND ТипИсполнителя in(0,1)', 1, "id,S" );
        зРабот.УстановитьПараметры( this.НомерЗаписи );
        return зРабот.Следующий() ? зРабот.cnt : 0;
    }
    ПолучитьЧасы(){
        //'оЗадание.@Дата ввода' = ТекДат();
        var зДанных = Query( 'SELECT MAX(h.[Дата ввода]) [Дата], ' +
            'SUM(60*datepart(hour, h.[Время работы]) + datepart(minute, h.[Время работы]))/60 [Часы], ' +
            'SUM(60*datepart(hour, h.[Время работы]) + datepart(minute, h.[Время работы]))%60 [Минуты], ' +
            'SUM(60*datepart(hour, h.[Время к оплате]) + datepart(minute, h.[Время к оплате]))/60 [ОплЧасы], ' +
            'SUM(60*datepart(hour, h.[Время к оплате]) + datepart(minute, h.[Время к оплате]))%60 [ОплМинуты] ' +
            'FROM ~ДО часы~ h ' +
            '   JOIN ~ДО задания~ task ON h.[Часы-Задание] = task.ROW_ID ' +
            'WHERE task.[Задание-Карточка] = :1', 1, "task,S" );
        зДанных.УстановитьПараметры( this.НомерЗаписи );
        if( зДанных.Следующий() ){
            // @Дата ввода
            // задание @ВремениПоЗаданию, @КОплатеПоЗаданию
            // карта @ВВремениПоЗаданию, @ВКОплатеПоЗаданию
            return {'Дата' : !зДанных.Дата.isEmpty() ? зДанных.Дата : new Date(),
                'Отработано' : зДанных.Часы + ":" + зДанных.Минуты.ЧислоСВедущимиНулями(2),
                'КОплате' : зДанных.ОплЧасы + ":" + зДанных.ОплМинуты.ЧислоСВедущимиНулями(2)};
        }
        return null;
    }
    ПолучитьИсториюHtml( нзРаботы, дляКарточки ){
        var стрСтили = '<html><body><style>' +
            'body{' +
            '  padding:0;' +
            '  margin:0;' +
            '  font-size: 8pt;' +
            '  padding-top:10px;' +
            '}' +
            '.btn-mini [class^="icon-"],' +
            '.btn-mini [class*=" icon-"] {' +
            '  margin-top: -1px;' +
            '  font-size: 8pt;' +
            '}' +
            '[class^="icon-"],' +
            '[class*=" icon-"] {' +
            '  display: inline-block;' +
            '  width: 14px;' +
            '  height: 14px;' +
            '  margin-top: 1px;' +
            '  line-height: 14px;' +
            '  vertical-align: text-top;' +
            '  background-image: url("resources/glyphicons-halflings.png");' +
            '  background-position: 14px 14px;' +
            '  background-repeat: no-repeat;' +
            '}' +
            '.icon-off {' +
            '  background-position: -384px 0;' +
            '}' +
            '.icon-info-sign {' +
            '  background-position: -120px -96px;' +
            '}' +
            '.icon-pencil {' +
            '  background-position: 0 -72px;' +
            '}' +
            '.btn:hover,' +
            '.btn:focus {' +
            '  color: #333333;' +
            '  text-decoration: none;' +
            '  background-position: 0 -15px;' +
            '  -webkit-transition: background-position 0.1s linear;' +
            '  -moz-transition: background-position 0.1s linear;' +
            '  -o-transition: background-position 0.1s linear;' +
            '  transition: background-position 0.1s linear;' +
            '}' +
            '.btn:hover,' +
            '.btn:focus,' +
            '.btn:active,' +
                '.btn.active,' +
                '.btn.disabled,' +
            '.btn[disabled] {' +
            '  color: #333333;' +
            '  background-color: #e6e6e6;' +
            '}' +
            '.btn-mini {' +
            '  padding: 0 6px;' +
            '  font-size: 8pt;' +
            '  -webkit-border-radius: 3px;' +
            '  -moz-border-radius: 3px;' +
            '  border-radius: 3px;' +
            '}' +
            '.btn {' +
            '  display: inline-block;' +
            '  padding: 4px 12px;' +
            '  margin-bottom: 0;' +
            '  font-size: 8pt;' +
            '  line-height: 20px;' +
            '  color: #333333;' +
            '  text-align: center;' +
            '  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.75);' +
            '  vertical-align: middle;' +
            '  cursor: pointer;' +
            '  background-color: #f5f5f5;' +
            '  background-color: #f5f5f5;' +
            '  background-image: -moz-linear-gradient(top, #ffffff, #e6e6e6);' +
            '  background-image: -webkit-gradient(linear, 0 0, 0 100%, from(#ffffff), to(#e6e6e6));' +
            '  background-image: -webkit-linear-gradient(top, #ffffff, #e6e6e6);' +
            '  background-image: -o-linear-gradient(top, #ffffff, #e6e6e6);' +
            '  background-image: linear-gradient(to bottom, #ffffff, #e6e6e6);' +
            '  background-repeat: repeat-x;' +
            '  border: 1px solid #cccccc;' +
            '  border-color: #e6e6e6 #e6e6e6 #bfbfbf;' +
            '  border-color: rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.1) rgba(0, 0, 0, 0.25);' +
            '  border-bottom-color: #b3b3b3;' +
            '  -webkit-border-radius: 4px;' +
            '  -moz-border-radius: 4px;' +
            '  border-radius: 4px;' +
            "  filter: progid:DXImageTransform.Microsoft.gradient(startColorstr='#ffffffff', endColorstr='#ffe6e6e6', GradientType=0);" +
            '  filter: progid:DXImageTransform.Microsoft.gradient(enabled=false);' +
            '  -webkit-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 1px 2px rgba(0, 0, 0, 0.05);' +
            '  -moz-box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 1px 2px rgba(0, 0, 0, 0.05);' +
            '  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 1px 2px rgba(0, 0, 0, 0.05);' +
            '}' +
            'button{' +
            '  font-size: 8pt;' +
            '  font-weight: normal;' +
            '  line-height: 20px;' +
            '  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;' +
            '}' +
            'button,' +
            'html input[type="button"],' +
            'input[type="reset"],' +
            'input[type="submit"] {' +
            '  cursor: pointer;' +
            '}' +
            'input[type="checkbox"] {' +
            '  float: left;' +
            '  margin-left: -20px;' +
            '  width: auto;' +
            '  margin: 4px 0 0;' +
            '  line-height: normal;' +
            '  cursor: pointer;' +
            '}' +
            'input[type="button"],' +
            'input[type="submit"],' +
            'input[type="reset"],' +
            'input[type="file"]::-webkit-file-upload-button,' +
            'button {' +
            '  text-align: center;' +
            '  cursor: default;' +
            '  color: buttontext;' +
            '  padding: 2px 6px 3px;' +
            '  border: 2px outset buttonface;' +
            '}' +
            'button{' +
            '  line-height: normal;' +
            '  font-size: 100%;' +
            '  margin: 0em;' +
            '  font: -webkit-small-control;' +
            '  color: initial;' +
            '  letter-spacing: normal;' +
            '  word-spacing: normal;' +
            '  text-transform: none;' +
            '  text-indent: 0px;' +
            '  text-shadow: none;' +
            '  text-align: start;' +
            '}' +
            'table {' +
            '  max-width: 100%;' +
            '  background-color: transparent;' +
            '  border-collapse: collapse;' +
            '  border-spacing: 0;' +
            '  font-size:8pt;' +
            '  font-family:Arial;' +
            '}' +
            '.table {' +
            '  width: 100%;' +
            '  margin: 0px;' +
            '  margin-bottom:20px;' +
            '}' +
            '.table th,' +
            '.table td {' +
            '  padding: 2px;' +
            '  line-height: 16px;' +
            '  text-align: left;' +
            '  vertical-align: top;' +
            '  border-top: 1px solid #dddddd;' +
            '}' +
            '.table th {' +
            '  font-weight: bold;' +
            '}' +
            '.table thead th {' +
            '  vertical-align: bottom;' +
            '}' +
            '.table caption + thead tr:first-child th,' +
            '.table caption + thead tr:first-child td,' +
            '.table colgroup + thead tr:first-child th,' +
            '.table colgroup + thead tr:first-child td,' +
            '.table thead:first-child tr:first-child th,' +
            '.table thead:first-child tr:first-child td {' +
            '  border-top: 0;' +
            '}' +
            '.table tbody + tbody {' +
            '  border-top: 2px solid #dddddd;' +
            '}' +
            '.table .table {' +
            '  background-color: #ffffff;' +
            '}' +
            '.table-condensed th,' +
            '.table-condensed td {' +
            '  padding: 2px 2px;' +
            '}' +
            '.table-bordered {' +
            '  border: 1px solid black;' +
            '  border-collapse: separate;' +
            '  *border-collapse: collapse;' +
            '  border-left: 0;' +
            '  -webkit-border-radius: 4px;' +
            '  -moz-border-radius: 4px;' +
            '  border-radius: 4px;' +
            '}' +
            '.table-bordered th,' +
            '.table-bordered td {' +
            '  border-left: 1px solid #dddddd;' +
            '}' +
            '.table-bordered caption + thead tr:first-child th,' +
            '.table-bordered caption + tbody tr:first-child th,' +
            '.table-bordered caption + tbody tr:first-child td,' +
            '.table-bordered colgroup + thead tr:first-child th,' +
            '.table-bordered colgroup + tbody tr:first-child th,' +
            '.table-bordered colgroup + tbody tr:first-child td,' +
            '.table-bordered thead:first-child tr:first-child th,' +
            '.table-bordered tbody:first-child tr:first-child th,' +
            '.table-bordered tbody:first-child tr:first-child td {' +
            '  border-top: 0;' +
            '}' +
            '.table-bordered thead:first-child tr:first-child > th:first-child,' +
            '.table-bordered tbody:first-child tr:first-child > td:first-child,' +
            '.table-bordered tbody:first-child tr:first-child > th:first-child {' +
            '  -webkit-border-top-left-radius: 4px;' +
            '  border-top-left-radius: 4px;' +
            '  -moz-border-radius-topleft: 4px;' +
            '}' +
            '.table-bordered thead:first-child tr:first-child > th:last-child,' +
            '.table-bordered tbody:first-child tr:first-child > td:last-child,' +
            '.table-bordered tbody:first-child tr:first-child > th:last-child {' +
            '  -webkit-border-top-right-radius: 4px;' +
            '  border-top-right-radius: 4px;' +
            '  -moz-border-radius-topright: 4px;' +
            '}' +
            '.table-bordered thead:last-child tr:last-child > th:first-child,' +
            '.table-bordered tbody:last-child tr:last-child > td:first-child,' +
            '.table-bordered tbody:last-child tr:last-child > th:first-child,' +
            '.table-bordered tfoot:last-child tr:last-child > td:first-child,' +
            '.table-bordered tfoot:last-child tr:last-child > th:first-child {' +
            '  -webkit-border-bottom-left-radius: 4px;' +
            '  border-bottom-left-radius: 4px;' +
            '  -moz-border-radius-bottomleft: 4px;' +
            '}' +
            '.table-bordered thead:last-child tr:last-child > th:last-child,' +
            '.table-bordered tbody:last-child tr:last-child > td:last-child,' +
            '.table-bordered tbody:last-child tr:last-child > th:last-child,' +
            '.table-bordered tfoot:last-child tr:last-child > td:last-child,' +
            '.table-bordered tfoot:last-child tr:last-child > th:last-child {' +
            '  -webkit-border-bottom-right-radius: 4px;' +
            '  border-bottom-right-radius: 4px;' +
            '  -moz-border-radius-bottomright: 4px;' +
            '}' +
            '.table-bordered tfoot + tbody:last-child tr:last-child td:first-child {' +
            '  -webkit-border-bottom-left-radius: 0;' +
            '  border-bottom-left-radius: 0;' +
            '  -moz-border-radius-bottomleft: 0;' +
            '}' +
            '.table-bordered tfoot + tbody:last-child tr:last-child td:last-child {' +
            '  -webkit-border-bottom-right-radius: 0;' +
            '  border-bottom-right-radius: 0;' +
            '  -moz-border-radius-bottomright: 0;' +
            '}' +
            '.table-bordered caption + thead tr:first-child th:first-child,' +
            '.table-bordered caption + tbody tr:first-child td:first-child,' +
            '.table-bordered colgroup + thead tr:first-child th:first-child,' +
            '.table-bordered colgroup + tbody tr:first-child td:first-child {' +
            '  -webkit-border-top-left-radius: 4px;' +
            '  border-top-left-radius: 4px;' +
            '  -moz-border-radius-topleft: 4px;' +
            '}' +
            '.table-bordered caption + thead tr:first-child th:last-child,' +
            '.table-bordered caption + tbody tr:first-child td:last-child,' +
            '.table-bordered colgroup + thead tr:first-child th:last-child,' +
            '.table-bordered colgroup + tbody tr:first-child td:last-child {' +
            '  -webkit-border-top-right-radius: 4px;' +
            '  border-top-right-radius: 4px;' +
            '  -moz-border-radius-topright: 4px;' +
            '}' +
            '.table-bordered caption + thead tr:first-child th:last-child,' +
            '.table-bordered caption + tbody tr:first-child td:last-child,' +
            '.table-bordered colgroup + thead tr:first-child th:last-child,' +
            '.table-bordered colgroup + tbody tr:first-child td:last-child {' +
            '  -webkit-border-top-right-radius: 4px;' +
            '  border-top-right-radius: 4px;' +
            '  -moz-border-radius-topright: 4px;' +
            '}' +
            '.table-striped tbody > tr:nth-child(odd)  td,' +
            '.table-striped tbody > tr:nth-child(odd)  th {' +
            '  background-color: #f9f9f9;' +
            '}' +
            '.table-hover tbody tr:hover  td,' +
            '.table-hover tbody tr:hover  th {' +
            '  background-color: #f5f5f5;' +
            '}' +
            '.table tbody tr.success  td {' +
            '  background-color: #dff0d8;' +
            '}' +
            '.table tbody tr.error  td {' +
            '  background-color: #f2dede;' +
            '}' +
            '.table tbody tr.warning  td {' +
            '   background-color: #fcf8e3;' +
            '}' +
            '.table tbody tr.info  td {' +
            '  background-color: #d9edf7;' +
            '}' +
            '.table-hover tbody tr.success:hover  td {' +
            '  background-color: #d0e9c6;' +
            '}' +
            '.table-hover tbody tr.error:hover  td {' +
            '   background-color: #ebcccc;' +
            '}' +
            '.table-hover tbody tr.warning:hover  td {' +
            '  background-color: #faf2cc;' +
            '}' +
            '.table-hover tbody tr.info:hover td {' +
            '  background-color: #c4e3f3;' +
            '}' +
            'background-color: #c4e3f3;' +
            '}</style>';
        var зДополнений = BufferedReader( 'SELECT job.[Отметки], job.ТипИсполнителя, job.ROW_ID, job.Примечание, ' +
            '   case when job.[Задание-Представитель]<0 then edit.ФИО ' +
            '        else man.ФИО end AS Редактор, ISNULL(sel.[Файлов],1) [Файлов] ' +
            'FROM ~ДО задания~ job ' +
            '     LEFT JOIN ( ' +
            '       SELECT [Файл-Задание], COUNT(ROW_ID) [Файлов] ' +
            '       FROM ~ДО внешние документы~ ' +
            '       WHERE [Файл-Задание]<>-1 ' +
            '       GROUP BY [Файл-Задание]) sel ON sel.[Файл-Задание]=job.ROW_ID ' +
            '     LEFT JOIN ~Сотрудники~ edit ON job.[Задание-Редактор]=edit.row_id ' +
            '     LEFT JOIN ~Частные лица~ man ON job.[Задание-Представитель]=man.row_id ' +
            'WHERE job.[Задание-Карточка]=:1 AND job.ТипИсполнителя IN(5,6,7,8) ' +
            'ORDER BY job.[Дата выдачи] desc, job.[Время выдачи] desc', 500, "card,S" );
        зДополнений.УстановитьПараметры( this.НомерЗаписи );
        var стрДополнений = '',
            путь_ист = "file:///" + КаталогКлиента().replace( /"\\"/g, "/" ) + "resources/";
        if( зДополнений.Количество() ){
            var зВнДок = Query( 'SELECT [Короткое имя], ROW_ID, Признаки FROM ~ДО внешние документы~ ' +
                'WHERE [Файл-Задание]=:1', 100, "job,S" );
            стрДополнений = '<table class="table table-condensed table-bordered">\n' +
                '<thead style="background: #f7f7f9;">\n' +
                '  <th style="width: 56%; padding: 2px; text-align: center">Дополнения к заявке</th>\n' +
                '  <th style="width: 10%; padding: 2px; text-align: center">Редактор</th>\n' +
                '  <th style="width: 22%; padding: 2px; text-align: center">Файл</th>\n' +
                '  <th style="width: 5%; padding: 2px; text-align: center">Выбор</th>\n' +
                '  <th style="width: 7%; padding: 2px; text-align: center">Действия</th>\n' +
                '</thead><tbody>';
            while( зДополнений.Следующий() ) {
                switch( зДополнений.ТипИсполнителя ) {
                    case 5:
                        var сч = 0;
                        зВнДок.УстановитьПараметры( зДополнений.ROW_ID );
                        while( сч < зДополнений.Файлов ) {
                            стрДополнений += '<tr class="info">\n';
                            if( сч == 0 ) {
                                стрДополнений += '<td rowspan=' + зДополнений.Файлов + '>' + зДополнений.Отметки.replaceAll( "\n", "<br>" ) + '</td>\n';
                                стрДополнений += '<td rowspan=' + зДополнений.Файлов + '>' + ФИО( зДополнений.Редактор ) + '</td>\n';
                            }
                            if( зВнДок.Следующий() ) {
                                if( дляКарточки || (зВнДок.Признаки & 1) == 0 ) {// для карточки документа и нормального файла (не временного) не показываем чекбоксы
                                    стрДополнений += '<td colspan=2>' + зВнДок['Короткое имя'] + '</td>';
                                } else {
                                    стрДополнений += '<td>' + зВнДок['Короткое имя'] +
                                        '</td><td><input type="checkbox" name="' + зВнДок['Короткое имя'] + '" style="margin: 0 35%;" onchange="javascript:javascriptOnclick(\'ВыбратьФайлДополнения()\',' + зВнДок.ROW_ID + ', this.checked,' + зДополнений.ROW_ID + ',"' + зВнДок['Короткое имя'] + '");"></td>';
                                }
                            } else {
                                стрДополнений += '<td></td><td></td>';
                                if( сч++ == 0 ) {
                                    if( дляКарточки ) {
                                        стрДополнений += '<td rowspan=' + зДополнений.Файлов + ' style="vertical-align: middle; text-align: center; width:100px !important;">' +
                                            ' <button class="btn btn-mini" style="padding:2px 2px; width:80px" onclick="javascript:javascriptOnclick(\'УдалитьДополнение\',' + зДополнений.ROW_ID + ');" title="Удалить"><img src="' + путь_ист + "remove.png" + '" style="border:0; padding:0; margin:0; width:14px; height:14px; display: inline-block; line-height: 14px; vertical-align: text-top;">Удалить</button>' +
                                            '</td></tr>\n';
                                    } else {
                                        стрДополнений += '<td rowspan=' + зДополнений.Файлов + ' style="vertical-align: middle; text-align: center; width:100px !important;">' +
                                            ' <button class="btn btn-mini" style="padding:2px 2px; width:130px" onclick="javascript:javascriptOnclick(\'ДействиеНадДополнением()\',' + зДополнений.ROW_ID + ');" title="Выбрать действие"><img src="' + путь_ист + "action.png" + '" style="border:0; padding:0; margin:0; width:14px; height:14px; display: inline-block; line-height: 14px; vertical-align: text-top;">Выбрать действие</button>' +
                                            '</td>';
                                    }
                                }
                                стрДополнений += "</tr>\n";
                            }
                        }
                        break;
                    case 6, 7, 8:
                        стрДополнений += '<tr>\n' +
                            '<td >' + зДополнений.Отметки.replaceAll( "\n", "<br>" ) + '</td>\n' +
                            '<td >' + ФИО( зДополнений.Редактор ) + '</td>\n' +
                            '<td colspan=3 style="vertical-align: middle">' + зДополнений.Примечание + '</td></tr>\n';
                        break;
                    }
                }
        }
        стрДополнений += "</tbody></table>";
        var зИстЗаявки = Query( 'SELECT task.ROW_ID, m.[ФИО], m.Телефон, chl.ФИО ЧФИО, edit.ФИО as [Редактор], task.[Статус завершения], task.Подзадания, ' +
            '   task.[Дата выдачи], convert(varchar(5), task.[Время выдачи], 14) [Время выдачи], ' +
            '   task.[Дата завершения], convert(varchar(5), task.[Время завершения], 14) [Время завершения], ' +
            '   task.[Отметки],kf.Название as Фаза, task.ТипИсполнителя, task.ROW_ID, hours.[Часов], hours.[КОплате] ' +
            'FROM ~ДО задания~ task ' +
            '    JOIN ~ДО Карточки~ d ON d.ROW_ID=task.[Задание-Карточка] ' +
            '    LEFT JOIN ~ДО фазы~ k ON k.ROW_ID = task.[Задание-Фаза] ' +
            '    LEFT JOIN ~ДО категории фаз~ kf ON kf.ROW_ID = k.[Фаза-Категория] ' +
            '    LEFT JOIN ~Сотрудники~ m ON m.ROW_ID=task.[Задание-Исполнитель] ' +
            '    LEFT JOIN ~Сотрудники~ edit ON edit.ROW_ID=task.[Задание-Редактор] ' +
            '    LEFT JOIN ~Частные лица~ chl ON task.[Задание-Представитель] = chl.ROW_ID ' +
            '    LEFT JOIN ( SELECT work.[row_id], ' +
            '                   sum(60*datepart(hour, hour.[Время работы]) + datepart(minute, hour.[Время работы])) [Часов], ' +
            '                   sum(60*datepart(hour, hour.[Время к оплате]) + datepart(minute, hour.[Время к оплате])) [КОплате] ' +
            '                FROM ~ДО часы~ hour ' +
            '                     JOIN ~ДО задания~ work ON hour.[Часы-Задание]=work.[row_id] ' +
            '                WHERE work.[Задание-Карточка]=:1 ' +
            '                GROUP BY work.[row_id]) hours on hours.ROW_ID=task.row_id ' +
            'WHERE d.ROW_ID = :2 AND task.ТипИсполнителя IN(0,1) ' +
            'ORDER BY task.[Дата выдачи] desc, task.[Время выдачи] desc', 100, "card1,S,card2,S" );
        зИстЗаявки.УстановитьПараметры( this.НомерЗаписи, this.НомерЗаписи );
        var стрИсторияРабот = '<table class="table table-condensed table-bordered ">\n' +
            '<thead style="background: #f7f7f9;">\n' +
            ' <th style="width: 20%; padding: 2px; text-align: center">Исполнитель</th>\n' +
            ' <th style="width: 20%; padding: 2px; text-align: center">Редактор</th>\n' +
            ' <th style="width: 20%; padding: 2px; text-align: center">Фаза</th>\n' +
            ' <th style="width: 8%; padding: 2px; text-align: center">Получено</th>\n' +
            ' <th style="width: 12%; white-space: nowrap; padding: 2px; text-align: center">Завершено</th>\n' +
            ' <th style="width: 8%; padding: 2px; text-align: center">Часов</th>\n'+
            ' <th style="width: 8%; padding: 2px; text-align: center">К Оплате</th>\n'+
        ' <th style="width: 4%; padding: 2px; text-align: center" title="Действия"></th>\n'+
        '</thead><tbody>\n';
        var стильСтр = "", черныйКоммент = true;
        var кол = 0, текстПодзадания = "";
        while( зИстЗаявки.Следующий() ){
            if( зИстЗаявки.ROW_ID == нзРаботы && зИстЗаявки.Подзадания != -1 )
                текстПодзадания = зИстЗаявки.Отметки;
            var атс = зИстЗаявки.Телефон.split( "#" )[0];

            if( зИстЗаявки['Статус завершения'] == 0 ) {// задание в процессе отображаем синим
                стильСтр = зИстЗаявки.ТипИсполнителя == 0 ? ' style="color: #0000ff;' : ' style="color: #21abff;';
            } else {
                стильСтр = '  style="color: #000000;';
            }
            стрИсторияРабот += '<tr' + стильСтр + ' border: 1px solid black; border-top: none;" >\n' +
                '<td style="border-left: 1px solid black; border-top: 1px solid black;">' + (зИстЗаявки.ТипИсполнителя == 0 ? ФИО( зИстЗаявки.ФИО ) + " (" + атс + ")" : ФИО( зИстЗаявки.ЧФИО )) + '</td>\n' +
                '<td style="border-top: 1px solid black;">' + ФИО( зИстЗаявки.Редактор ) + '</td>\n' +
                '<td style="border-top: 1px solid black;">' + (зИстЗаявки.Подзадания == -1 ? зИстЗаявки.Фаза : "Подзадание") + '</td>\n' +
                '<td style="border-top: 1px solid black;">' + зИстЗаявки['Дата выдачи'].format( 'rusDate' ) + '</td>\n' +
                '<td style="border-top: 1px solid black;">' + (!зИстЗаявки['Дата завершения'].isEmpty() ? зИстЗаявки['Дата завершения'].format( 'rusDate' ) + "  (" + (зИстЗаявки['Дата завершения'].countOfDayBetweenDates( зИстЗаявки['Дата выдачи'] ) + 1) + " дн.)" : "") + '</td>\n' +
                '<td style="border-top: 1px solid black;">' + (зИстЗаявки.Часов ? Math.floor(зИстЗаявки.Часов/60).ЧислоСВедущимиНулями(3) + ":" + (зИстЗаявки.Часов%60).ЧислоСВедущимиНулями(2) : "") + '</td>\n' +
                '<td style="border-top: 1px solid black;">' + (зИстЗаявки.КОплате ? Math.floor(зИстЗаявки.Часов/60).ЧислоСВедущимиНулями(3) + ":" + (зИстЗаявки.Часов%60).ЧислоСВедущимиНулями(2) : "") + '</td>\n' + '<td style="text-align: center; border-right: 1px solid black; border-top: 1px solid black;">\n';

            if( зИстЗаявки['Статус завершения'] == 0 && дляКарточки )
                стрИсторияРабот += '<button class="btn btn-mini" style=" padding:4px 2px" onclick="javascript:javascriptOnclick(\'ЗавершитьЗадание\',' + зИстЗаявки.ROW_ID + ');" title="Завершить"><img src="' + путь_ист + "close.png" + '" style="border:0; padding:0; margin:0; width:14px; height:14px; display: inline-block; line-height: 14px; vertical-align: text-top;"></button>\n';
            if( (зИстЗаявки['Статус завершения'] == 0 && дляКарточки )
                || (кол==0 && зИстЗаявки['Статус завершения'] == 1 && дляКарточки) )
            стрИсторияРабот += '<button class="btn btn-mini" style=" padding:4px 2px" onclick="javascript:javascriptOnclick(\'ОтменитьЗадание\',' + зИстЗаявки.ROW_ID + ');" title="Отменить работу"><img src="' + путь_ист + "undo.png" + '" style="border:0; padding:0; margin:0; width:14px; height:14px; display: inline-block; line-height: 14px; vertical-align: text-top;"></button>\n';
            стрИсторияРабот += "</td></tr>";
            if( зИстЗаявки.Отметки ){
                стильСтр = ' style="color: #000000"';
                стрИсторияРабот += '<tr><td colspan="8" style="border: 1px solid black; border-top: none;"><p><span' + стильСтр + ">" + зИстЗаявки.Отметки.replaceAll( "\n", "<br>" ) + '</span></p></tr>\n';
            }
            кол++;
        }
        var стрПодзадание = "";
        if( текстПодзадания ){
            стрПодзадание = '<table class="table table-condensed table-bordered">\n' +
                '<thead style="background: #f7f7f9;">\n' +
                '  <th style="font-size: 10pt;width: 63%; padding: 2px; text-align: left">Ваше подзадание по заявке:</th>\n' +
                '</thead><tbody>';
            стрПодзадание += '<td>' + текстПодзадания + '</td>';
        }

        стрИсторияРабот += '</tbody></table></body></html>';
        // this.Запись['@HTMLTable']
        return стрСтили + стрПодзадание + стрДополнений + стрИсторияРабот;
    }
    НовыйНомер(){
        if( this.Договор.НомерЗаписи < 0 ) return 0;
        var зНомера = Query( 'SELECT ISNULL(max(card.[Номер]), 0) [Номер] ' +
            'FROM ~ДО Карточки~ card ' +
            '     JOIN ~Договор~ cont ON card.[Карточка-Договор]=cont.ROW_ID ' +
            'WHERE cont.ROW_ID=:1', 1, "id,S" );
        зНомера.УстановитьПараметры( this.Договор.НомерЗаписи );
        return зНомера.Следующий() ? зНомера.Номер + 1 : 1;
    }

    /**
     * устанавливает справочные данные текущего задания заявки
     * @returns {boolean} если такое задание существует
     */
    УстановитьТекущуюФазу(){
        if( this.ТекущаяФаза.id == -1 ){
            var текСтадия = BufferedReader( 'SELECT k.ROW_ID, kf.Название, isp.ФИО, task.ROW_ID idJob, task.ТипИсполнителя ' +
                'FROM ~ДО задания~ task ' +
                '     JOIN ~Сотрудники~ isp ON task.[Задание-Исполнитель] = isp.Row_ID ' +
                '     JOIN ~ДО фазы~ k ON k.ROW_ID = task.[Задание-Фаза] ' +
                '     JOIN ~ДО категории фаз~ kf ON kf.ROW_ID = k.[Фаза-Категория] ' +
                'WHERE task.[Задание-Карточка]=:1 AND task.Подзадания<0 AND task.ТипИсполнителя IN(0,1)' +
                'ORDER BY task.[Дата выдачи] desc, task.[Время выдачи] desc, task.ROW_ID desc', 1, "id,S" );
            текСтадия.УстановитьПараметры( this.НомерЗаписи );
            if( текСтадия.Следующий() ) {
                this.ТекущаяФаза.id = текСтадия.ROW_ID;
                this.ТекущаяФаза.Название = текСтадия.Название;
                this.ТекущаяФаза.Исполнитель = текСтадия.ФИО;
                this.ТекущаяФаза.Работа = текСтадия.idJob;
                this.ТекущаяФаза.ТипИсполнителя = текСтадия.ТипИсполнителя;
            }
        }
        return this.ТекущаяФаза.id != -1;
    }
    ПолучитьЧасыДоговор(){
        var зИнфПоДоговору = Query( 'DECLARE @d int = :1, @dat datetime = :2, @par int = :3; ' +
            ';WITH S AS( ' +
            '   select h.[Время к оплате], w.[Статус завершения] [СтатусРаботы], c.[ПланЧасов], d.[Тема], h.Перенос ' +
            '   FROM ~ДО задания~ w ' +
            '        JOIN ~ДО карточки~ c ON c.[row_id]=w.[Задание-Карточка] ' +
            '        JOIN ~Договор~ d ON d.[row_id]=c.[Карточка-Договор] ' +
            '        LEFT JOIN ~ДО Часы~ h ON w.[row_id]=h.[Часы-Задание] ' +
            '   WHERE d.[ROW_ID]=@d ' +
            "      AND h.[Дата ввода] BETWEEN CASE WHEN d.[Тема] IN ('СКА','СЭА') THEN @dat " +
            "                        WHEN d.[Тема] IN ('СКП','СЭД','СКД') THEN d.[Начало договора] " +
            "                        ELSE '20450509' END " +
            "      AND CASE WHEN d.[Тема] IN ('СКА','СЭА','СКП','СЭД','СКД') THEN getdate() " +
            "          ELSE '20450509' END " +
            ") " +
            "SELECT (SELECT TOP 1 Значение FROM ~Свойства~ sv WHERE sv.[Виды-Параметры]=@par AND sv.[Параметры-Договор]=@d ORDER BY ДатКнц desc) AS Всегочасов, " +
            "   ROUND( CONVERT(float, SUM(r.ОтрабВремя))/60, 2) [ОтрабВремя], r.[СтатусРаботы], r.[ПланЧасов], r.Тема " +
            "FROM ( " +
            "   SELECT 60*DATEPART(hour, [Время к оплате]) + DATEPART(minute, [Время к оплате]) [ОтрабВремя], " +
            "       [СтатусРаботы], [ПланЧасов], Тема" +
            "   FROM S WHERE Перенос & 1=0 " +
            "   UNION ALL" +
            "   SELECT -1*( 60*DATEPART(hour, [Время к оплате]) + DATEPART(minute, [Время к оплате]) ) ОтрабВремя," +
            "       [СтатусРаботы], [ПланЧасов], Тема " +
            "   FROM S WHERE Перенос & 1>0 ) AS r " +
            "GROUP BY r.[СтатусРаботы], r.[Тема], r.[ПланЧасов]", 1, "Dog,S,Dat,D,par,S" );
        var колРабот = 0;
        зИнфПоДоговору.УстановитьПараметры( this.Договор.НомерЗаписи, new Date().СледующийМесяц(0), ДанныеПараметра("АБОН_ЧАСЫ") );
        //@ИнфПланЧасов @ИнфВсегоЧасов @ИнфФактЧасов @ИнфПланЧасов @ИнфВозмПланФ @ИнфВозмПланПФ
        // @МеткаИнфВсегоЧасов
        var информация = {};
        while( зИнфПоДоговору.Следующий() ) {
            информация.ВсегоЧасов = Number( зИнфПоДоговору.ВсегоЧасов );
            информация.ФактЧасов  += зИнфПоДоговору.ОтрабВремя;
            информация.ПланЧасов  += зИнфПоДоговору.ОтрабВремя;
            информация.ВозмПланФ  = информация.ВсегоЧасов - информация.ФактЧасов;
            информация.ВозмПланПФ = информация.ВсегоЧасов - информация.ПланЧасов;
            if( зИнфПоДоговору.Тема == "СКА" || зИнфПоДоговору.Тема == "СЭА" || зИнфПоДоговору.Тема == "СУА" ) {
                информация.МВсегоЧасов = "часов по договору в месяц";
            } else if( зИнфПоДоговору.Тема == "СКД" || зИнфПоДоговору.Тема == "СКК" )
                информация.МВсегоЧасов = "в год";
            колРабот++;
        }
        информация.ПланЧасов += this.Объект.ПланЧасов;

        if( колРабот == 0 ){
            var зАбонЧасов = Query( 'SELECT TOP 1 sv.Значение ' +
                'FROM ~Договор~ d ' +
                '     JOIN ~Свойства~ sv ON sv.[Параметры-Договор] = d.ROW_ID ' +
                'WHERE d.ROW_ID=:1 ' +
                "   AND sv.[Виды-Параметры] = CASE WHEN d.[Тема] IN ('СКА','СЭА','СКП') " +
                "                             THEN (SELECT TOP 1 ROW_ID FROM ~Виды параметров~ WHERE [Название]='АБОН_ЧАСЫ') " +
                "                             ELSE -2 END " +
                "ORDER BY sv.ДатКнц DESC", 1, "Dog,S" );
            зАбонЧасов.УстановитьПараметры( this.Договор.НомерЗаписи );
            информация.ВсегоЧасов = зАбонЧасов.Следующий() ? Number( зАбонЧасов.Значение ) : 0;
        }
        return информация;
    }

    /**
     * копирует файлы электронного сообщения в заявку
     * @param нзСообщение - ид электронного сообщения
     * @returns {Array} - список добавленных файлов
     */
    ДобавитьФайлыИзСообщения( нзСообщение ){
        if( нзСообщение < 0 ) return false;

        var зКатегории = BufferedReader( 'SELECT ROW_ID FROM ~ДО категории файлов~ WHERE Название like :1', 10, "name,A" );
        зКатегории.УстановитьПараметры( "Файл из почты" );
        var категорияФ = -1;
        if( зКатегории.Следующий() ) {
            категорияФ = зКатегории.ROW_ID;
        } else { // категорию не нашли - создадим
            var категория = new БазовыйОбъект( 'ДО категории файлов' );
            категория.ПрочитатьИзКонтекста( {'Название' : 'Файл из почты'} );
            категорияФ = категория.Внести();
        }
        var сообщение = new кЭлСообщение( нзСообщение );
        var вложенияСообщения = сообщение.ПолучитьВложение( -10 );
        var результат = [];
        for( let вложение of вложенияСообщения ){
            // в заявку копируем только файлы и html
            if( вложение.Тип != 0 && вложение.Тип != 4 ) continue;
                // вложение письма - html
            if( вложение.Тип == 4 ) {
                вложение.ИмяФайла = "Письмо.html";
                вложение.ОбразФайла = вложение.СменитьКодировкуHtml( "cp866" );
                    // todo может для оптимизации перенести в параметр добавления документа, использовать УпаковатьДвоичноеПоле
                вложение.ОбразФайла = УпаковатьДанные( вложение.ОбразФайла );
            }
            let внДок = this.ДобавитьВнешнийДокумент( вложение.ОбразФайла, вложение.ИмяФайла, категорияФ,
                сообщение.Объект['Организация-Сообщения'] );
            if( внДок > 0 ) результат.push( {'Документ' : внДок,
                'Имя' : вложение.ИмяФайла} );
        }

        return результат;
    }

    /**
     * добавялет внешний документ к заявке
     * @param образ - бинарное или текстовой представление файла
     * @param короткоеИмя - имя документа
     * @param категория - категория документа
     * @param организация - организация на документе
     * @returns {number|*}
     */
    ДобавитьВнешнийДокумент( образ, короткоеИмя, категория, организация ){
        var оВнешнийДокумент = new БазовыйОбъект( "ДО внешние документы" );
        var датаИзменения = new Date();

        оВнешнийДокумент.ПрочитатьИзКонтекста( {'Файл-Карточка' : this.НомерЗаписи,
        'Короткое имя' : короткоеИмя,
        'Файл-Категория' : категория,
        'Дата изменения' : датаИзменения,
        'Добавлен' : датаИзменения,
        'Время изменения' : датаИзменения,
        'Файл-Организация' : организация,
        'ИзмененияАвтор' : Пользователь().Имя} );
        if( оВнешнийДокумент.Внести() ){
            var оХранилище = new БазовыйОбъект( "ДО хранилище" );
            оХранилище.ПрочитатьИзКонтекста( {'Образ' : образ,
            'Хранилище-Файл' : оВнешнийДокумент.НомерЗаписи} );
            оХранилище.Внести();
        }
        return оВнешнийДокумент.НомерЗаписи;
    }

    /**
     * создает и отправляет сообщение с текстом на адрес назначения в зависимости от режима
     * @param нзОтправитель - номер записи либо частного лица организации, либо самой организации
     * @param текст - текстовая часть сообщения электронной почты
     * @param текстHml - html часть сообщения электронной почты
     * @param тема - тема собщения
     * @param кому - адресат сообщения
     * @param режим - режим отправки уведомления:
     *      режим = 0 - то адрес берем с организации, отправляем уведомление с вопросом
     *      режим = 1, то адрес берем с частного лица, row_id которого записано в нзОрг, отправляем уведомление без вопроса
     *      режим = 2, отправляем уведомление без вопроса, адрес берем с организации
     * @param заявка - необязательная ссылка на заявку
     * @returns {number} - номер записи сохраненного сообещния в базе
     */
    ОтправитьУведомление( нзОтправитель, текст, текстHml, тема, кому, режим, заявка ){
        if( режим != 1 ) {
            var зПараметрУведомление = Query( 'SELECT TOP 1 val.Значение ' +
                'FROM ~Значения параметров~ val ' +
                '   JOIN ~Параметры~ vp ON val.[Параметр-Значения]=vp.ROW_ID ' +
                "WHERE val.[Орг-Параметры]=:1 AND vp.имя LIKE 'уведэлпочта'", 1, "org,S" );
            зПараметрУведомление.УстановитьПараметры( нзОтправитель );
            if( зПараметрУведомление.Следующий() && зПараметрУведомление.Значение.toUpperCase() == "нет" ) return -1;
        }
        try {
            if( заявка == null ) заявка = -1;
            var копия = "";
            var ящик = this.Объект['Карточки-Маршрут>Маршрут-Ящик'];
            // не задан ящик, с которого отправляем уведомления
            var сообщение = new кЭлСообщение(); // сообщение для отправки уведомления
            ящик = сообщение.ПрочитатьЯщик( ящик > 0 ? ящик : "Отправка уведомлений" );
            if( ящик == -1 ) throw new StackError( "Не указан почтовый ящик для отправки уведомлений" );

            if( !кому ) { // передали пустой адрес - возьмем с организации
                var обАдреса = null;
                if( режим == 1 ) {
                    обАдреса = сообщение.АдресаПредставителей( нзОтправитель.toString() );
                    нзОтправитель = -1;
                } else {
                    обАдреса = сообщение.АдресаОрганизаций( нзОтправитель.toString() );
                }
                кому = обАдреса.Адреса;
            }
            if( !кому ) throw new StackError( "Не указан электронный адрес для уведомления" );
            if( режим == 0 && !ДаНет( "Отправить уведомление на адрес " + кому + "?" ) ) return 0;
            if( режим != 1 ) копия = new кОрганизация( нзОтправитель ).ЭлектронныйАдресОбязательнойКопии();
            сообщение.ПрочитатьИзКонтекста( {
                'Кому': кому,
                'Тема': тема,
                'Приоритет': 0,
                'Папка': сообщение.Ящик.ПолучитьПапку( "Уведомления" ),
                'Папка_Узел': 0,
                'Организация-Сообщения': нзОтправитель,
                'Заявка-Почта': заявка,
                'Признаки': 522 // Обработано, Отправлено, Удалено
            } );
            сообщение.УстановитьОтправителя();
            /*if( сообщение.СоздатьСообщение(текст, текстHml) &&
             сообщение.ЭлПочта.ОтправитьПисьмо() && сообщение.Внести() > 0 ) сообщение.УстановитьДату( 'создано,получено' );*/
            // от греха подальше - просто складываем письма в нужной папке ящика
            if( сообщение.СоздатьСообщение( текст, текстHml ) && сообщение.Внести() > 0 ) сообщение.УстановитьДату( 'создано,получено' );
            return сообщение.НомерЗаписи;
        } catch( err ) {
            if( err instanceof StackError ) err.ОбработкаОшибки();
        }
    }
}

class кРабота extends БазовыйОбъект {
    /**
     *
     * @param параметр
     * @param заявка
     */
    constructor( параметр, заявка ){
        super( 'ДО задания', -1 );
        /**
         * Текущая фаза работы
         * @type {кФаза}
         */
        this.Фаза;
        /**
         * заявка, заданием которой является данная работа
         * @type {кЗаявка}
         */
        this.Заявка = заявка;
        if( параметр ) this.Проинициализировать( параметр );
        /**
         * Переход на следующу фазу работы
         * @type {кПереход}
         */
        this.Переход;
        /**
         * Массив с параметрами перехода, предлагаемыми по умолчанию для перехода с диалогом
         * @type {Array}
         */
        this.ПараметрыПереходаПоУмолчанию = [];
        this.ЭтоДо = (Задача() == 'Документооборот');
    }

    /**
     * Заполнение базовых членов класса
     * @param параметр
     * @returns {boolean}
     */

    Проинициализировать( параметр ){
        var установлено = false;
        if( typeof параметр == 'string' ) параметр = Number( параметр );
        if( typeof параметр == 'number' && super.Прочитать(параметр) ){
            if( !this.Заявка ) this.Заявка = new кЗаявка( this.Объект['Задание-Карточка'] );
            //return true;
        } else if( typeof параметр == 'object' ){
            this.Установить( НомерЗаписи(параметр) );
            if( super.ПрочитатьИзКонтекста(параметр) ) {
                if( !this.Заявка ) this.Заявка = new кЗаявка( this.Объект['Задание-Карточка'] );
                //return true;
            }
        }
        this.Фаза = new кФаза( this, this.Объект["Задание-Фаза"] );
        //return false;
    }
    /**
     * Получение списка открытых работ, завичимых от текущей
     */
    ПолучитьЗависимыеРаботы(){
        var з_ПодЗадания = BufferedReader( `Select ROW_ID
                                                    From ~ДО Задания~
                                                   Where Подзадания = :1 and [Статус завершения] = 0
                                                 `, 100, "Row,S" );
        var мРаботы = [];
        з_ПодЗадания.УстановитьПараметры( this.НомерЗаписи );
        while( з_ПодЗадания.Следующий() ){
            мРаботы[з_ПодЗадания.ROW_ID] = з_ПодЗадания.ROW_ID;
        }
        return мРаботы;
    }
    ПроверитьПравоНаЗавершение(){
        if( this.Объект["Задание-Исполнитель"] != НомерЗаписи(Пользователь()) &&
            !УказанноеПравоНаРесурс( "ЕстьВозможностьПереназначать") && !Супервизор()) {
            return false;
        }
        return true;

    }
    ПолучитьСледующийНомер() {
        var зСледующийНомер = Query(`SELECT ISNULL( MAX([Свой номер]), 0 ) [nextnum]
                            FROM ~ДО задания~
                            WHERE [Задание-Карточка]=:1`, 100, "Path,S");
        зСледующийНомер.УстановитьПараметры(this.Заявка.НомерЗаписи);
        if (зСледующийНомер.Следующий()) {
            return зСледующийНомер.nextnum + 1;
        }
        return 1;
    }
    ПолучитьУточненияПоЗадания(){
        var зНУточнений = BufferedReader( `SELECT job.row_id, job.Примечание
                                           FROM ~ДО задания~ job JOIN
                                             ( SELECT [Задание-Карточка] as Zk,max( [Свой номер] ) as [Свой номер]
                                               FROM ~ДО задания~ dz2 GROUP BY [Задание-Карточка] )tbl
                                             ON tbl.Zk = job.[Задание-Карточка] AND job.[Свой номер] = tbl.[Свой номер] AND ТипИсполнителя=0,
                                             ~ДО задания~ job1
                                           WHERE job.[Задание-Карточка]=:1 AND job1.ТипИсполнителя=5 AND job1.[Задание-Карточка]=job.[Задание-Карточка]`, 100, "card,S" );
        var мУточнения = [];
        зНУточнений.УстановитьПараметры( this.Объект["Задание-Карточка"] );
        while( зНУточнений.Следующий() ){
            мУточнения[зНУточнений.ROW_ID] = зНУточнений.Примечание;
        }
    }

    /**
     * Возвращает данные по предыдущей фазе
     * =================================
     *  НомерФазыВыход
     *  нзИсполнитель
     *  нзОрганизацияИсполн
     *  СтатусЗавершения
     *  Последний шаг
     *  Название
     *  ДополнительныеФлаги
     *  Предыдущая фаза
     *  ФИО
     *  Организация
     * @param нашИсполн true если исполнитель из нашей организации
     * @returns {Array}
     */
    ПолучитьДанныеПредыдущейФазы( нашИсполн ){
        var допСтр = ``;
        if( нашИсполн ) {
            допСтр = " AND dz2.[Задание-Исполнитель] <> -1 ";
        }
        var зТекФаза = Query( `SELECT Top 1 df.Номер, dkf.Название, st.Row_ID нзИсполнитель, chL.Row_ID нзОрганизацияИсполн,
                                   st.ФИО, chL.ФИО Организация
                            FROM ~ДО задания~ dz
                            JOIN (     SELECT [Задание-Карточка] as Zk,max( [Свой номер] ) as [Свой номер]
                                         FROM ~ДО задания~ dz2
                                       WHERE dz2.Row_ID <> :1 ` + допСтр + `
                                     GROUP BY [Задание-Карточка]
                                  )tbl ON tbl.Zk = dz.[Задание-Карточка] AND dz.[Свой номер] = tbl.[Свой номер]
                            JOIN ~ДО фазы~ df ON dz.[Задание-Фаза] = df.ROW_ID
                            JOIN ~ДО категории фаз~ dkf ON dkf.ROW_ID = df.[Фаза-Категория]
                            LEFT JOIN ~Сотрудники~ st ON st.ROW_ID = dz.[Задание-Исполнитель]
                            LEFT JOIN ~Частные лица~ chL ON chL.ROW_ID = dz.[Задание-Представитель]
                            WHERE dz.[Задание-Карточка] = :2 AND dz.Row_ID <> :3 `, 1, "S,S,S,S,S,S" );
        var мРез = [];
        зТекФаза.УстановитьПараметры( this.НомерЗаписи, this.Объект["Задание-Карточка"], this.НомерЗаписи );
        if( зТекФаза.Следующий() ){
            мРез["НомерФазыВыход"] = зТекФаза.Номер;
            мРез["нзИсполнитель"] = зТекФаза.нзИсполнитель;
            мРез["нзОрганизацияИсполн"] = зТекФаза.нзОрганизацияИсполн;
            мРез["СтатусЗавершения"] = 1;
            мРез["Последний шаг"] = 0;
            мРез["Название"] = зТекФаза.Название;
            мРез["ДополнительныеФлаги"] = 0;
            мРез["Предыдущая фаза"] = this.Объект["Задание-Фаза"];
            мРез["ФИО"] = зТекФаза.ФИО;
            мРез["Организация"] = зТекФаза.Организация;
        }
        return мРез;
    }
    ПроверитьВозможностьЗавершенияРаботы( ТихийРежим ) {
        if (!this.Объект) return 0;
        var ОшибкаЗавершения = "Завершить задание невозможно, т.к. ";
        if (this.ПолучитьЗависимыеРаботы().length) {
            throw  new StackError(ОшибкаЗавершения + "имеются незавершенные подзадания")
        }
        if (!this.ПроверитьПравоНаЗавершение()) {
            throw  new StackError(ОшибкаЗавершения + "у вас недостаточно прав")
        }
        if (this.ПолучитьУточненияПоЗадания()) {
            throw  new StackError(ОшибкаЗавершения + "По заданию есть незакрытые уточнения")
        }
        if (!ТихийРежим) return 0;
        if (!this.Переход) throw new StackError(ОшибкаЗавершения + "в задании не указан переход.");
        if (this.Переход.ПараметрыПерехода.нзИсполнитель == -1
            && this.Переход.ИсполнительИзНашейОрганизации) throw new StackError(ОшибкаЗавершения + "в задании не указан исполнитель.");
        if (this.Переход.ПараметрыПерехода.нзОрганизацияИсполн == -1
            && !this.ИсполнительИзНашейОрганизации) throw new StackError(ОшибкаЗавершения + "в задании не указан сторонний исполнитель.");
        // Необязательные поля заполним по умолчанию
        if (!this.Переход.ПараметрыПерехода.ДатНач) this.Переход.ПараметрыПерехода.ДатНач = new Date()
        if (!this.Переход.ПараметрыПерехода.ДатКнц) this.Переход.ПараметрыПерехода.ДатКнц = new Date();
        if (!this.Переход.ПараметрыПерехода.ДатАвтоЗав) this.Переход.ПараметрыПерехода.ДатАвтоЗав = new Date();
        if (!this.Переход.ПараметрыПерехода.Комментарий) this.Переход.ПараметрыПерехода.Комментарий = "";
        if (this.Переход.ПараметрыПерехода.фОтпСообщение == undefined) this.Работа.ПараметрыПерехода.фОтпСообщение = 0;
    }

    /**
     *
     * @returns {boolean}
     */
	ЗавершитьРаботуЧерезДиалог(){
		var длгЗавершение = СоздатьДиалог("ДО - Завершение работы");
		длгЗавершение.Обработчик.Работа = this;
        //Заполним параметры по умолчанию
        for( let Элемент in this.ПараметрыПереходаПоУмолчанию ){
            if( !this.ПараметрыПереходаПоУмолчанию.hasOwnProperty((Элемент)) ) continue;
            длгЗавершение[Элемент] = this.ПараметрыПереходаПоУмолчанию[Элемент];
        }
		var Завершено = длгЗавершение.Выполнить();
        if( !Завершено ) return false;
        return true;
	}
		

    /**
     * Завершение работы
     * @param ТихийРежим true если завершение надо выполнять без диалога
     *  должен быть определен член this.Переход и доп. параметры
     *  this.Работа.Переход.ПараметрыПерехода.нзИсполнитель или this.Переход.ПараметрыПерехода.нзОрганизацияИсполн
     * @returns {boolean}
     */
    Завершить( ТихийРежим ){
        this.ПроверитьВозможностьЗавершенияРаботы( ТихийРежим );
        ВывестиСтатус("Выполняются операции...");

            // Подзадания завершаем без параметров выбора след. фазы
            if( this.Объект && this.Объект.Подзадания != -1 ){
                if( this.Объект['Статус завершения'] != 1 )
                {
                    if( !ТихийРежим ) {
                        var ДО_Завершение_подзадания = СоздатьДиалог("ДО - Завершение подзадания");
                        ДО_Завершение_подзадания.Обработчик.Работа = this;
                        ДО_Завершение_подзадания.Обработчик.ДатаЗакрытия = new Date();
                        //Заполним параметры по умолчанию
                        for( let Элемент in this.ПараметрыПереходаПоУмолчанию ){
                            if( !this.ПараметрыПереходаПоУмолчанию.hasOwnProperty((Элемент)) ) continue;
                            ДО_Завершение_подзадания[Элемент] = this.ПараметрыПереходаПоУмолчанию[Элемент];
                        }
                        ДО_Завершение_подзадания.Выполнить();
                    }
                    return true;
                }
                return false;

            }
        if( !ТихийРежим ){
			if( !this.ЗавершитьРаботуЧерезДиалог() )
				return false;
        }
        var мНовыеЗадания = this.СоздатьСледующееЗадание();
        var Переход = this.Переход;
        var ФазаПерехода;
        if (this.Фаза.ВыбратьПредыдущуюФазуиИсполнителя) {
            ФазаПерехода = Переход.ФазаВход;
        } else {
            ФазаПерехода = Переход.ФазаВыход;
        }
        if( мНовыеЗадания.length > 0 ){
                // Меняем статус на текущем задании
                // TODO лучше доделать сохранение через базовй объект из контекста
                var оДЗ = Объект( "ДО Задания" )
                ПрочитатьЗаписьТаблицы( оДЗ, this.НомерЗаписи );
                оДЗ["Задание-Редактор"]  = НомерЗаписи( Пользователь() );
                оДЗ["Статус завершения"] = this.Переход.Объект["Статус завершения"];
                оДЗ["Дата завершения"]   = new Date();
                оДЗ["Время завершения"]  = new Date();
                //оДЗ["Отметки"]           = this.Переход.ПараметрыПерехода.Комментарий;
                СохранитьЗапись( оДЗ );

                if( ФазаПерехода.ПоследнийШаг ){
                    var оДК = Объект( "ДО карточки" );
                    ПрочитатьЗаписьТаблицы( оДК, оДЗ["Задание-Карточка"] );
                    оДК["Дата завершения"] = new Date();
                    оДК["Время завершения"] = new Date();
                    СохранитьЗапись( оДК );
                }
        }

        // стоит признак что это последний шаг и нужно
        // все задания закрыть автоматически
        if( ФазаПерехода.ПоследнийШаг ){
            for( let инд in мНовыеЗадания ){
                if( !мНовыеЗадания.hasOwnProperty(инд) ) continue;
                мНовыеЗадания[инд].Объект["Статус завершения"] = 1;
                мНовыеЗадания[инд].Объект["Дата завершения"] = new Date();;
                мНовыеЗадания[инд].Объект["Время завершения"] = new Date();
                мНовыеЗадания[инд].Сохранить();
            }
        } else {
            for( let инд in мНовыеЗадания ) {
                if (!мНовыеЗадания.hasOwnProperty(инд)) continue;
                new кМессенджер(1, this.Заявка, мНовыеЗадания[инд]).Отправить(Переход.ПараметрыПерехода.нзИсполнитель,
                    this.Переход.ПараметрыПерехода.Комментарий, ФазаПерехода.ДанныеКатегории['Название'] );
            }
        }
        if( this.Переход.ПараметрыПерехода.фОтпСообщение ) { // отправляем сообщение с коментарием завершения
            this.Объект.Примечание = this.Переход.ПараметрыПерехода.Комментарий;
            var ошибка = this.ОтправитьОтвет( true );
            if( ошибка ) Сообщить( ошибка );
        }
        return true;
    }

    СоздатьСледующееЗадание() {
        if (!this.Переход) {
            throw new StackError("Не определен переход для завершения работы.")
        }
        var Переход = this.Переход;
        var ФазаПерехода;
        if (this.Фаза.ВыбратьПредыдущуюФазуиИсполнителя) {
            ФазаПерехода = Переход.ФазаВход;
        } else {
            ФазаПерехода = Переход.ФазаВыход;
        }
        var ЗавершитьДо = this.Заявка.ЗавершитьДо();
        var СледующийНомер = this.ПолучитьСледующийНомер();
        var сегодня = new Date();
        var ЗавершитьДо = this.Заявка.Объект["Завершить до"];
        if (!ЗавершитьДо.isEmpty()) {
            ЗавершитьДо = new кРабочийКалендарь().ПрибавитьРабочиеДни(сегодня, ФазаПерехода.Объект["План в часах"]);
        }
        var мЗадания = [];
        var Работа = new кРабота();
        Работа.Очистить();
        Работа.Объект["Завершить до"] = !Переход.ПараметрыПерехода.ДатКнц.isEmpty() ? Переход.ПараметрыПерехода.ДатКнц : ЗавершитьДо;
        Работа.Объект["Задание-Редактор"] = НомерЗаписи(Пользователь());
        Работа.Объект["Задание-Карточка"] = this.Заявка.НомерЗаписи;
        Работа.Объект["Задание-Фаза"] = ФазаПерехода.НомерЗаписи;
        Работа.Объект["Предыдущий номер"] = this.Номер;
        Работа.Объект["Папки"] = -10;

        Работа.Объект["Дата выдачи"] = !Переход.ПараметрыПерехода.ДатНач.isEmpty() ? Переход.ПараметрыПерехода.ДатНач : сегодня;
        Работа.Объект["Время выдачи"] = сегодня;
        Работа.Объект["Свой номер"] = СледующийНомер;
        Работа.Объект["Срок исполнения"] = ФазаПерехода.Объект["План в часах"];
        Работа.Объект["Отметки"] = Переход.ПараметрыПерехода.Комментарий || "";
        Работа.Объект["Задание-Наряд"] = -1;
        Работа.Объект["Статус завершения"] = 0;
        Работа.Объект["ТипИсполнителя"] = 0;
        Работа.Объект["Дата автозавершения"] = ФазаПерехода.Автозавершение
            ? new Date().ПрибавитьДату( "день", this.АвтозавершениеДней ) : "";
        Работа.Объект["Задание-Исполнитель"] = Переход.ПараметрыПерехода.нзИсполнитель;
        Работа.Объект["Задание-Представитель"] = Переход.ПараметрыПерехода.нзОрганизацияИсполн;
        Работа.Объект["ТипИсполнителя"] = Работа.Объект["Задание-Представитель"] > 0 ? 1 : 0;
        var резпоз = Работа.Внести();
        мЗадания[резпоз] = Работа;
        // Создаем подзадания, если в маршруте они были указаны
        Работа.Очистить();
        ФазаПерехода.ЗаполинтьШаблоны();
        for( let i in ФазаПерехода.Шаблоны ){
            if( !ФазаПерехода.Шаблоны.hasOwnProperty(i) ) continue;
            Работа.Объект["Задание-Исполнитель"] = ФазаПерехода.Шаблоны[i].Объект["Задание-Исполнитель"];
            Работа.Объект["Отметки"] = ФазаПерехода.Шаблоны[i].Объект["Отметки"];
            Работа.Объект["Задание-Карточка"] = Работа.Объект["Задание-Карточка"];
            Работа.Объект["Подзадания"] = резпоз;
            Работа.Объект["Дата выдачи"] = new Date();
            Работа.Объект["Время выдачи"] = new Date();
            Работа.Объект["Свой номер"] = СледующийНомер;
            Работа.Объект["Задание-Фаза"] = Работа.Объект["Задание-Фаза"];
            Работа.Объект["Статус завершения"] = 0;
            Работа.Объект["Папки"] = -10;
            резпоз = Работа.Сохранить();
            мЗадания[резпоз] = Работа;
        }
        return мЗадания;
    }

    ЕстьОтмеченныеЧасы(){
        var зЧасы = BufferedReader( 'SELECT ROW_ID FROM ~ДО Часы~ WHERE [Часы-Задание] = :2 ', 1, "id,S" );
        зЧасы.УстановитьПараметры( this.НомерЗаписи );
        return зЧасы.Следующий() ? true : false;
    }
    Отменить( завершитьДо ){
        if( this.НомерЗаписи < 0 || !this.Удалить() ) return false;

        var зПоследнейРаботы = BufferedReader( 'SELECT ROW_ID FROM ~ДО задания~ ' +
            'WHERE [Задание-Карточка] = :1 ORDER BY ROW_ID DESC', 1, "S,S" );
        зПоследнейРаботы.УстановитьПараметры( this.Заявка.НомерЗаписи );
        if( зПоследнейРаботы.Следующий() ){
            this.Проинициализировать( зПоследнейРаботы.ROW_ID );
            var сейчас = new Date();
            this.ПрочитатьИзКонтекста( {'Статус завершения' : 0,
                'Время завершения' : сейчас,
                'Дата завершения' : сейчас,
                'Завершить до' : завершитьДо} );
            return this.Сохранить();
        }
        return false;
    }
    ОтправитьОтвет( добавитьКоммент ){
        if( !this.Заявка || this.Заявка.НомерЗаписи < 0 ) throw new StackError( "Не указана заявка\n Отправка невозможна." );
        var кому = this.Заявка.Объект['ЭлПочта'];
        var организация = this.Заявка.Объект['Карточка-Организация'];
        if( !кому ) { // не было адреса для ответа - возьмем с организации
            if( this.ЭтоДо ) {
                кому = this.Заявка.Объект['Карточка-Организация>email'];
            } else {
                if( this.Заявка.Объект['КлиентТип'] == "Частное лицо" ) {
                    кому = this.Заявка.Объект['Заявка-Частное лицо>email']
                    организация = -1;
                } else {
                    кому = this.Заявка.Объект['Карточка-Организация>email'];
                }
            }
        }
        var мАдрес = кому.match( /<[A-Za-z0-9_@\.\-]+>/i );
        if( мАдрес ) кому = мАдрес[0];
        if( !кому ) throw new StackError( "На заявке не указана электронная почта для ответа" );

            // смотрим ящик для отправки писем на маршруте
        var сообщение = new кЭлСообщение(); // сообщение для отправки уведомления
        var ящик = this.Заявка.Объект['Карточки-Маршрут>Маршрут-Ящик'];
        ящик = сообщение.ПрочитатьЯщик( ящик > 0 ? ящик : "Отправка уведомлений" );
        if( ящик == -1 ) throw new StackError( "Не указан почтовый ящик для отправки ответа по заявке" );

        var копия = new кОрганизация( организация ).ЭлектронныйАдресОбязательнойКопии();
        var номер = this.Заявка.Объект['Номер'] + (this.Заявка.Объект['СтороннийНомер'] ? " / " + this.Заявка.Объект['СтороннийНомер'] : "" );
        var тема = "Стек: по заявке № " + номер +
            " от " + this.Заявка.Объект['Дата создания'].format('rusDate');
        var текст = '';
        if( !сообщение.Ящик.ЭтоHtml() ) {
            текст = 'По Вашей заявке № ' + номер +
                " от " + this.Заявка.Объект['Дата создания'].format('rusDate') + "\n" +
                this.Заявка.Объект['Примечание'] +
                ( this.Объект.Примечание && добавитьКоммент ? "\n\nСообщаю следующее:\n" + this.Объект.Примечание : "" );
        } else {
            текст = '<div><strong>По Вашей заявке № ' + номер +
                " от " + this.Заявка.Объект['Дата создания'].format('rusDate') + "</strong></div><div><i>" +
                this.Заявка.Объект['Примечание'] + "</i></div>" +
                ( this.Объект.Примечание && добавитьКоммент ? "<br><div><strong>Сообщаю следующее:</strong></div><div>" + this.Объект.Примечание : "" ) + "</div>";
        }
        сообщение.ПрочитатьИзКонтекста( {
            'Кому': кому,
            'Копия' : копия,
            'Тема': тема,
            'Папка' : сообщение.Ящик.НомерЗаписи,
            'Приоритет': 0,
            'Организация-Сообщения': организация,
            'Заявка-Почта' : this.Объект['Задание-Карточка']
        } );
        сообщение.Ответить( 'ДОборот', текст, this.НомерЗаписи );
        return "";
    }
}
/**
 * @class кПереход
 */
class кПереход extends БазовыйОбъект{
    constructor( Фаза, НомерЗаписи, Контекст ){
        super( "ДО переходы", НомерЗаписи, Контекст );
        this.Фаза = Фаза;
        /**
         * ROW_ID следующей фазы
         * @type {number}
         */
        this.ФазаПерехода = this.Фаза.НомерЗаписи;
        /**
         * Требует ли указать исполнителя
         * @type {boolean}
         */
        this.ТребуетИсполнителя = false;
        /**
         * Какой разрешен исполнитель true - наш, else - сторонний
         * @type {boolean}
         */
        this.ИсполнительИзНашейОрганизации = true;
        /**
         * Требует ли указание орг-ции
         * @type {boolean}
         */
        this.ТребуетОрганизацию = false;
        /**
         * Требует ли срок исполнения
         * @type {boolean}
         */
        this.ТребуетСрокИсполнения = false;
        /**
         * Назначить исполнителя с предыдущей фазы
         * @type {boolean}
         */
        this.НазначитьПредыдущегоИсполинетля = false;
        /**
         * Требует изменить срок завершения
         * @type {boolean}
         */
        this.ТребуетСменыСрокаЗавершения = false;
        /**
         * Отправлять ли уведомление клиенту
         * @type {boolean}
         */
        this.ОтправитьУведомлениеКлиенту = false;
        /**
         * Возможность указания периода работы
         * @type {boolean}
         */
        this.МожноУказатьПериодРаботы = false;
        /**
         * Состояние при завершении
         * @type {number}
         */
        this.СостояниеПризавершении = 0;
        /**
         * Исполнители перехода
         * @type {{}}
         */
        this.Исполнитель = {};

        /**
         * Список параметров, выбранных для осуществления перехода
         * @type {{}}
         */
        this.ПараметрыПерехода = {}

        /**
         * Фаза перехода
         * @type {кФаза}
         * @private
         */
        this._ФазаВыход;
        /**
         * Предыдущая фаза
         * @type {кФаза}
         * @private
         */
        this._ФазаВход;
        if( this.НомерЗаписи ){
            this.Инициализировать();
        }
    }

    /**
     * Возвращает фазу, на которую будет совершен переход
     */
    get ФазаВыход() {
        if( !this._ФазаВыход || this._ФазаВыход.НомерЗаписи != this.Объект["Фаза-Выход"] ){
            this._ФазаВыход = new кФаза(null,this.Объект["Фаза-Выход"])
        }
        return this._ФазаВыход;
    }

    /**
     * Возвращает фазу, с которой был совершен переход
     */
    get ФазаВход(){
        if( !this._ФазаВход || this._ФазаВход.НомерЗаписи != this.Объект["Фаза-Вход"] ){
            this._ФазаВход = new кФаза(null,this.Объект["Фаза-Вход"])
        }
        return this._ФазаВход;
    }
    Инициализировать(){
        if( !this.НомерЗаписи ){
            throw  new StackError( "Невозможно инициализировать переход с номером записи " + this.НомерЗаписи );
        }
        this.ИсполнительИзНашейОрганизации = true;
        this.СостояниеПризавершении          = this.Объект["Статус завершения"];
        this.ИсполнительИзНашейОрганизации   = this.Объект["ТипСотрудника"] ? false : true;
        this.ТребуетИсполнителя              = this.Объект.ДополнительныеФлаги % 2   >= 1  ? true : false;
        this.ТребуетОрганизацию              = this.Объект.ДополнительныеФлаги % 4   >= 2  ? true : false;
        this.ТребуетСрокИсполнения           = this.Объект.ДополнительныеФлаги % 8   >= 4  ? true : false;
        this.НазначитьПредыдущегоИсполинетля = this.Объект.ДополнительныеФлаги % 16  >= 8  ? true : false;
        this.ТребуетСменыСрокаЗавершения     = this.Объект.ДополнительныеФлаги % 32  >= 16 ? true : false;
        this.ОтправитьУведомлениеКлиенту     = this.Объект.ДополнительныеФлаги % 64  >= 32 ? true : false;
        this.МожноУказатьПериодРаботы        = this.Объект.ДополнительныеФлаги % 128 >= 64 ? true : false;
        this.ПолучитьИсполнителей();
    }
    ПолучитьИсполнителей() {
        this.Исполнитель.нзОрганизация = -1;
        this.Исполнитель.Организация = "";
        this.Исполнитель.нзПредставитель = -1;
        this.Исполнитель.нзСотрудник = -1;
        this.Исполнитель.Сотрудник = "";
        this.Исполнитель.Представитель = "";
        if (this.НазначитьПредыдущегоИсполинетля && this.Фаза.Работа ) {
            var поискРаботы = BufferedReader(`SELECT TOP 1 zad.[Задание-Исполнитель], zad.[Задание-Наряд],
                                                        zad.Папки, zad.[Задание-Представитель]
                                           FROM ~ДО Задания~ zad
                                              JOIN ~ДО Фазы~ doFaz ON zad.[Задание-Фаза] = doFaz.Row_ID
                                                                      and doFaz.Row_ID = :1
                                           WHERE zad.[Задание-Карточка] = :2  and zad.[Подзадания] = -1
                                           ORDER BY zad.ROW_ID desc`, 1, "S,S,S,S");

            поискРаботы.УстановитьПараметры(this.Объект["Предыдущая фаза"], this.Фаза.Работа["Задание-Карточка"]);
            if (поискРаботы.Следующий()) {
                this.Исполнитель.нзПредставитель = поискРаботы["Задание-Представитель"];
                this.Исполнитель.нзСотрудник = поискРаботы["Задание-Исполнитель"];
                var Сотрудник = new кСотрудник(this.Исполнитель.нзСотрудник)
            }
        }
        if ( this.Фаза.ИсполнительПоУмолчанию != -1 ) {
            var Сотрудник = new кСотрудник(this.Фаза.ИсполнительПоУмолчанию);
            this.Исполнитель.нзОрганизация = Сотрудник.ПолучитьНзОрганизации();
            this.Исполнитель.нзСотрудник = this.Фаза.ИсполнительПоУмолчанию;
        }


        // Если исполнитель не указан и организация сторонняя, проверим, если представитель всего 1, возмем его
        if ( this.Исполнитель.нзПредставитель == -1 && !this.ИсполнительИзНашейОрганизации ) {
            var мПредставители = кОрганизация.ПолучитьПредставителейОрганизации(this.НомерЗаписи);
            var i = 0;
            for( let Представитель in мПредставители ){
                if( мПредставители.hasOwnProperty(Представитель) ) continue;
                if( i == 1 ){
                    this.Исполнитель.нзПредставитель = -1;
                    break;
                }
                this.Исполнитель.нзПредставитель = мПредставители[Представитель].ROW_ID;
                i++;
            }
        }
        /** ??????
        Если( мИсполн.нзОрг == -1 И мИсполн.ИмяПред == "" И зПереходы.ТипСотрудника == 1 И 'оТекЗадание.Задание-Карточка>Карточка-Представитель' != -1 )
        {
            мИсполн.нзПред = 'оТекЗадание.Задание-Карточка>Карточка-Представитель';
            мИсполн.ИмяОрг = мИсполн.ИмяПред = Есть( мИсполн.нзПред ) ? ФИОПредставителя( мИсполн.нзПред ) : "";
        }
         */
        this.Исполнитель.Сотрудник = this.Исполнитель.нзСотрудник != -1 ? Сотрудник.Объект["ФИО"] : "";
        if( this.Исполнитель.нзПредставитель != -1 ) {
            var з_пред = Query(`Select Top 1 ФИО From ~Частные лица~ Where ROW_ID = :1`, 10, "ROW,S");
            з_пред.УстановитьПараметры(this.Исполнитель.нзПредставитель);
            this.Исполнитель.Представитель = з_пред.Следующий() ? з_пред.ФИО : "";
        } else {
            this.Исполнитель.Представитель = "";
        }
        return this.Исполнитель;
    }
}
/**
 * @class кФаза
 */
class кФаза extends БазовыйОбъект{
    /**
     *
     * @param Работа
     * @param НомерЗаписи
     * @param Контекст
     */
    constructor( Работа, НомерЗаписи, Контекст ){
        super( 'ДО фазы', НомерЗаписи, Контекст );
        if( !Контекст ){
            this.Прочитать( НомерЗаписи );
        }

        this.Работа = Работа;
        /**
         * Порядковый номер фазы
         * @type {number}
         */
        this.Номер = 0;
        /**
         * Срок исполнения фазы
         * @type {number}
         */
        this.Срок = 0;
        /**
         * /TODO что это??
         * @type {number}
         */
        this.Автовыполнение = 0;
        /**
         * Куда переходить при автовыполнении
         * TODO наверное класс надо
         * @type {number}
         */
        this.ПереходПриУспехе = 0;
        /**
         * массив переходов с элементами кПереход
         * @type {Array}
         */
        this.Переходы = [];
        /**
         * Завершать автоматически по истечении срока, true - завершать, false - нет
         * @type {boolean}
         */
        this.Автозавершение = false;
        /**
         * Через сколько дней завершать
         * @type {number}
         */
        this.АвтозавершениеДней = 0;
        /**
         * через сколько дней отправить письмо предупреждение
         * @type {number}
         */
        this.АвтозавершениеПредупреждение = 0;
        /**
         * Куда переходить при автозавершении
         * @type {number}
         */
        this.АвтозавершениеФаза = 0;
        /**
         * Примечание к фазе
         * @type {string}
         */
        this.Комментарий = "";
        /**
         * ROW_ID исполнителя по умолчанию
         */
        this.ИсполнительПоУмолчанию = -1;
        /**
         * Выбрать предыдущую фазу и исполнителя
         * @type {boolean}
         */
        this.ВыбратьПредыдущуюФазуиИсполнителя = false;
        /**
         * Это последний шаг
         * @type {boolean}
         */
        this.ПоследнийШаг = false;
        /**
         * Комментарий обязателен
         * @type {boolean}
         */
        this.ОбязателенКомментарий = false;
        /**
         * Список подзаданий при завершении, нереализовано
         * @type {Array}
         */
        this.Подзадания = [];

        /**
         * Список шаблонов перехода
         * @type {БазовыйОбъект}
         */
        this.Шаблоны =[];
        if( this.НомерЗаписи ){
            this.Проинициализировать();
        }
        this.ДанныеКатегории = [];
    }

    /**
     * Заполнение массива this.Шаблоны шаблоны переходов фаз
     */
    ЗаполинтьШаблоны(){
        if( !this.зШаблоны ) {
            this.зШаблоны = Query( ` SELECT * FROM ~ДО задания шаблон~ WHERE [Задание-Фаза] = :1 `, 10, "rID,S" );
        }
        this.зШаблоны.УстановитьПараметры( this.НомерЗаписи );
        while( this.зШаблоны.Следующий() ){
            this.Шаблоны[this.зШаблоны.ROW_ID] = new БазовыйОбъект( "ДО задания шаблон", this.зШаблоны.ROW_ID, this.зШаблоны );
        }
    }
    /**
     *
     */
    ЗаполнитьПереходы(){
        if( !this.зПереходы ) {
            this.зПереходы = Query(
                ` SELECT ROW_ID, [Фаза-Вход], [Фаза-Выход], [Автовыполнение], [Интервал], [Название]
                    , [Исходный текст], [Номер], [ДополнительныеФлаги], [Предыдущая фаза]
                    , [Статус завершения], [ТипСотрудника]
                    FROM ~ДО переходы~
                    WHERE [Фаза-Вход] = :1 `, 10, "rID,S");
        }
        this.зПереходы.УстановитьПараметры( this.НомерЗаписи );
        while( this.зПереходы.Следующий() ){
            this.Переходы[this.зПереходы.ROW_ID] = new кПереход( this, this.зПереходы.ROW_ID, this.зПереходы );
        }
    }
    ЗаполнитьКатегорию() {
        var зКатегория = Query( `SELECT * FROM ~ДО категории фаз~ WHERE ROW_ID = :1 `, 1, "rID,S" );
        зКатегория.УстановитьПараметры( this.НомерЗаписи );
        while( зКатегория.Следующий() ){
            this.ДанныеКатегории['Название']        = зКатегория.Название;
            this.ДанныеКатегории['Автовыполнение']  = зКатегория.Автовыполнение;
            this.ДанныеКатегории['Цвет']            = зКатегория.Цвет;
        }
    }
    Проинициализировать(){
        if( !this.НомерЗаписи ){
            throw  new StackError( "Невозможно инициализировать фазу с номером записи " + this.НомерЗаписи );
        }
        this.ЗаполнитьПереходы();
        this.ЗаполнитьКатегорию();
        this.Номер = this.Объект.Номер;
        //todo переделать. Поля Срок нет в объекте!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        //if( ЕстьСвойство(this.Объект, "Срок") != 1 )
        //    Сообщить( "todo переделать. Поля Срок нет в объекте!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!" );
        //this.Срок = this.Объект.Срок;
        this.Автовыполнение = this.Объект.Автовыполнение;
        this.ПереходПриУспехе = this.Объект.СледующийНомер;

        this.Автозавершение = this.Объект["Автоматическое завершение"] ? true : false;
        this.АвтозавершениеДней = this.Объект["Авт_зав_дней"];
        this.АвтозавершениеПредупреждение = this.Объект["Авт_зав_дней"];
        this.АвтозавершениеФаза = this.Объект["Авт_переход"];
        //this.Комментарий = this.Объект.Комментарий;
        this.ИсполнительПоУмолчанию = this.Объект["Исполнитель по умолчанию"];
        this.ВыбратьПредыдущуюФазуиИсполнителя = this.Объект["УказатьПредФазу"] ? true : false;
        this.ПоследнийШаг =  this.Объект["Последний шаг"] ? true : false;
        this.ОбязателенКомментарий = this.Объект["Обязателен комментарий"] ? true : false;
    }
}
class ПраваСотрудниковДО {
    /**
     * // Проверяет входит ли пользователь в определённые группы пользователей
     * // Если входит в любую из предложенных то возвращает 1, иначе 0
     * @param _пользователь позиция Сотрудника = НомерЗаписи( Пользователь() )
     * *@param() _пользователь Далее можно перечислять названия групп (допустимо указание не полностью)
     * @returns {*}
     */
    static ПроверкаПравСотрудника(_пользователь) {
        var зПольз = Query(`SELECT TOP 1 pr.ROW_ID
                          FROM ~Права~ pr JOIN ~Группы~ gr ON pr.[Группы-Права]=gr.ROW_ID
                          WHERE [Пользователи-Права] = SOME(SELECT ROW_ID FROM ~Пользователи~
                                                        WHERE [Номер]=(SELECT [ТабНомер] FROM ~Сотрудники~ WHERE row_id = :1)
                                ) AND gr.[Название] LIKE :2`, 10, "User,S,Group,A");
        var ВходитВГруппы = 0;
        for (let i = 0; i < arguments.length; i++) {
            зПольз.УстановитьПараметры(_пользователь, "%" + arguments[i] + "%");
            ВходитВГруппы += зПольз.Следующий() ? 1 : 0;
        }
        return Math.min(ВходитВГруппы, 1);
    }
}

class кМессенджер extends БазовыйОбъект {
    /**
     * @param тип - тип сообщения
     * @param заявка @type {кБазовыйОбъект} - объект от таблицы 'ДО карточки', не обязательный
     * @param задание @type {кБазовыйОбъект} - от таблицы 'ДО задания', не обязательный
     */
    constructor( тип, заявка, задание ){
        super( "ДО сообщения" );
        /**
         * тип сообщения:
         * 0 - обычное сообщение чата
         * 1 - новое задание
         * 2 - изменение задания
         * 3 - переназначенное задание
         * 4 - новость
         * 5 - новое подзадание
         * 6 - уточнение задания
         * 7 - уведомление о выполнении задания
         * 8 - обычное уведомление
         * @type {Number}
         */
        this.Тип = тип;
        /**
         * задание мессенджера
         * @type {кРабота}
         */
        this.Задание = задание;
        /**
         * заявка мессенджера
         * @type {кРабота}
         */
        this.Заявка = заявка;
    }

    /**
     * возвращает
     * @returns {boolean}
     * @constructor
     */
    Проверка(){
        try {
            if( this.Заявка && this.Заявка.НомерЗаписи < 0 ) throw new StackError( "Мессенджер: у заявки отрицательный НомерЗаписи" );
            if( this.Задание && this.Задание.НомерЗаписи < 0 ) throw new StackError( "Мессенджер: у задания отрицательный НомерЗаписи" );
            if( this.Тип < 0 || this.Тип > 8 ) throw new StackError( "Мессенджер: неправильный тип сообщения" );
        }
        catch( err ){
            if( err instanceof StackError ) err.ОбработкаОшибки();
            return false;
        }

        return true;
    }

    /**
     * отправляет сообщение всем действующим сотрудникам
     * @param отКого @type {string} - отправитель сообщения
     * @param сообщение @type {string} - текст сообщения
     */
    ОтправитьСотрудникам( отКого, сообщение ){
        if( !this.Проверка() ) return false;
            // извлекаем всех действующих сотрудников
        var зСотрудники = BufferedReader( "SELECT [row_id] as [Кому] \
            FROM ~Сотрудники~ \
            WHERE [ФИО] NOT LIKE '%группа%' AND [ФИО] NOT LIKE '%отдел%' \
                 AND [ФИО] NOT LIKE '%Администратор%' AND [Сотрудники_ADD] != 0 AND [Уволен] IS NULL \
            ORDER BY [ФИО]", 500 );
        зСотрудники.УстановитьПараметры();
        while( зСотрудники.Следующий() ) {
            this.Добавить( зСотрудники.Кому, сообщение, '', отКого );
        }
        return true;
    }
    Отправить( кому, сообщение, названиеРаботы, тема ) {
        if( !this.Проверка() ) return false;

        var пользователь = НомерЗаписи( Пользователь() );
        var исполнитель = this.Задание.Объект['Задание-Исполнитель'];
        var рез = false;
        // Задание назначаем сами себе - сообщения не нужны
        if( пользователь == исполнитель && исполнитель == кому ) return true;

        switch( this.Тип ) {
            case 1: // Текущий пользователь посылает новому исполнителю задание
                if( кому != -1 ) рез = this.Добавить( кому, сообщение, тема, названиеРаботы );
                if( пользователь != исполнитель ) { // Текущий пользователь снял с текущего исполнителя задание
                    this.Тип = 3;
                    рез = this.Добавить( исполнитель );
                }
                break;
            case 2:
                рез = this.Добавить( исполнитель );
                break;
            case 5:
            case 6: // тема "Произошло изменение заявки, Необходимо выбрать действие."
                рез = this.Добавить( исполнитель, this.Задание.Объект.Отметки, тема, названиеРаботы );
                break;
        }
        return рез;
    }

    /**
     * добавляет сообщение в чат
     * @param кому @type {number} - ид сотрудника, кому предназначено сообщение
     * @param сообщение @type {string} - текст сообщения
     * @param тема @type {string} - тема сообщения, если есть заявка, то Примечание (текст заявки)
     * @param названиеРаботы @type {string} - название работы
     * @param отКого @type {string} - подпись отправителя
     * @returns {Boolean} - true, если удалось внести запись
     */
    Добавить( кому, сообщение, тема, названиеРаботы, отКого ){
        if( сообщение == undefined ) сообщение = '';
        if( названиеРаботы == undefined ) названиеРаботы = '';
        if( отКого == undefined ) отКого = Пользователь().ФИО;
        if( тема == undefined && this.Заявка ) тема = this.Заявка.Объект.Примечание;

        var номерЗаявки = this.Заявка ? this.Заявка.Объект.Номер : '';
        var заказчик = this.Заявка ? this.Заявка.Объект['Карточка-Организация>Название'] : '';
        var сегодня = new Date();
        this.ПрочитатьИзКонтекста( { 'ВремяЗаписи' : сегодня.format( "rusDateTime" ),
            'Пользователь' : кому,
            'ТипСообщения' : this.Тип,
            'ОтКого' : отКого,
            'НомерЗаявки' : номерЗаявки,
            'Заказчик' : заказчик,
            'Сообщение' : сообщение,
            'Тема' : тема,
            'НазваниеРаботы' : названиеРаботы,
            'Просмотрено' : 0
        } );
        return this.Внести();
    }
}

/**
 * Класс с методами автоматический действи ДО
 * @class АвтоматическиеДействия
 * АвтоматическиеДействия.ПредупреждениеЗакрытияЗаявок()
 */
class АвтоматическиеДействия {
    constructor( идРаботы ) {
        this.ПолучитьШаблонСообщения = Query( ` SELECT [ШаблонТекст] FROM ~Сообщения Шаблон~ WHERE ROW_ID = :1 `, 1, "rID,S");
        /**
         * задание для автоматических действий
         * @type {кРабота}
         */
        this.Работа = null;
        if( идРаботы ) this.Работа = new кРабота( идРаботы );
    }
    /**
     * Метод завершения заявок на фазе с флагом автозавершения
     */
    static ЗавершениеЗаявок() {
        Сообщить("Старт автоматического завершения!");
        var зФазыАвт = BufferedReader(`SELECT faz.*, vihod.Номер НомерФазыВыход, vihod.ROW_ID as ИдФазаПереход FROM ~ДО Фазы~ faz
                                     JOIN ~До фазы~ vihod on vihod.ROW_ID = faz.Авт_переход
                                     WHERE faz.[Автоматическое завершение]=1`, 100, "");
        зФазыАвт.УстановитьПараметры();
        ВывестиСтатус("Закрытие заявок...");
        while (зФазыАвт.Следующий()) {
            var зТекРаб = BufferedReader(`SELECT * FROM ~ДО Задания~ WHERE [Статус завершения] = 0 and [Задание-Фаза] = :1 `, "100", "S,S");
            зТекРаб.УстановитьПараметры(зФазыАвт.Row_ID);
            while (зТекРаб.Следующий()) {
                var датаЗакрытия = new кРабочийКалендарь().ПрибавитьРабочиеДни(зТекРаб['Дата выдачи'], зФазыАвт.Авт_зав_дней);
                if (зТекРаб['Дата автозавершения'] > датаЗакрытия) // если на задании установлена дата авт. завершения, то берем ее
                    датаЗакрытия = зТекРаб['Дата автозавершения'];
                if (датаЗакрытия <= new Date() && зТекРаб['Завершить до'] <= new Date()) {
                    //this.Работа = new кРабота();
                    var Уведомление = new АвтоматическиеДействия( зТекРаб.ROW_ID );
                    ВывестиСтатус("Закрытие заявок: " + Уведомление.Работа.Заявка.Объект.Номер);
                    // todo может метод по созданию перехода у Работы, чтобы не думать о нзИсполнитель?
                    Уведомление.Работа.Переход = new кПереход(зТекРаб.ИдФазаПереход);
                    Уведомление.Работа.Переход.ПараметрыПерехода.нзИсполнитель = НомерЗаписи(Пользователь());
                    Уведомление.Работа.Переход.ПараметрыПерехода.Комментарий = зФазыАвт.Авт_коммент.trim();
                    Уведомление.Работа.Завершить( true );

                    Уведомление.ОтправитьУведомление();
                    if (зФазыАвт.Авт_завершение_ф_ия) {
                        ВыполнитьФункцию(зФазыАвт.Авт_завершение_ф_ия);
                        Пауза(30000);
                    }
                }
            }
        }
    }

    /**
     * Метод отправи предупреждений по заявке на фазе с флагом автозавершения
     */
    static ПредупреждениеЗакрытияЗаявок() {
        Сообщить("Старт операции");
        var зФазыАвт = BufferedReader(`SELECT faz.*, vihod.Номер НомерФазыВыход FROM ~ДО Фазы~ faz
                                     JOIN ~До фазы~ vihod on vihod.ROW_ID = faz.Авт_переход
                                     WHERE faz.[Автоматическое завершение]=1`, 100, "");
        зФазыАвт.УстановитьПараметры();
        var оСообщЗаг = Объект("Сообщения Заголовок");
        while (зФазыАвт.Следующий()) {
            var зТекРаб = BufferedReader(`SELECT TOP 1 * FROM ~ДО Задания~ WHERE [Статус завершения] = 0 and [Задание-Фаза] = :1 `, "100", "S,S");
            зТекРаб.УстановитьПараметры(зФазыАвт.Row_ID);
            while (зТекРаб.Следующий()) {
                ВывестиСтатус("Закрытие заявок...");
                var датаПредупр = new кРабочийКалендарь().ПрибавитьРабочиеДни(зТекРаб['Дата выдачи'], зФазыАвт.Авт_зав_дней);
                датаПредупр = датаПредупр.ПрибавитьДату("день", зФазыАвт.Авт_пред_дней * ( -1 ));
                if (датаПредупр <= new Date() && зТекРаб['Завершить до'].ПрибавитьДату("день", зФазыАвт.Авт_пред_дней * ( -1 )).equalsWithoutTime(new Date())) {
                    this.Работа = new кРабота(зТекРаб.ROW_ID);
                    ВывестиСтатус("Предупреждение: " + this.Работа.Заявка.Объект.Номер);
                    var Предупрежедние = new АвтоматическиеДействия();
                    Предупрежедние.Работа = this.Работа;
                    Предупрежедние.ОтправитьПредупреждение();
                    if (зФазыАвт.Авт_предупр_ф_ия) {
                        ВыполнитьФункцию(зФазыАвт.Авт_предупр_ф_ия);
                    }
                }
            }
        }
    }
    // Тема письма
    get Заголовок(){
        var сТема = "Стек - по заявке №" + this.Работа.Заявка.Объект.Номер + " от " + this.Работа.Заявка.Объект['Дата создания'].format('dd.MM.yyyy') + " по договору " +
            this.Работа.Заявка.Договор.Объект['Номер'] + "/" + this.Работа.Заявка.Договор.Объект['Тема'];
        return сТема;
    }
    // определяем исполнителя, который отправил запрос на уточнение
    get Исполнитель(){
        var зПревРаб = BufferedReader(`SELECT Top 1 m.ФИО FROM ~ДО Задания~ task
                                     LEFT JOIN ~Сотрудники~ m ON m.ROW_ID=task.[Задание-Исполнитель]
                                     WHERE task.[Статус завершения] = 1 and task.[Задание-Карточка] = :1
                                     order by task.[Дата выдачи] desc, task.[Время выдачи] desc`, "100", "S,S");
        зПревРаб.УстановитьПараметры( this.Работа.Заявка.НомерЗаписи );
        var фиоИсп = зПревРаб.Следующий() ? зПревРаб.ФИО : "";
        return фиоИсп;
    }
    // Когда закроется заявка
    get ДатаЗакрытия(){
        var ДатаЗакрытия = new кРабочийКалендарь();
        return ДатаЗакрытия.ПрибавитьРабочиеДни(this.Работа.Объект['Дата выдачи'], this.Работа.Фаза.Объект.Авт_зав_дней);
    }
    // Получаем шаблон письма из базы для предупреждения
    get ТекстПредупреждения(){
        this.ПолучитьШаблонСообщения.УстановитьПараметры( this.Работа.Фаза.Объект["Шаблон предупреждение"] );
        while( this.ПолучитьШаблонСообщения.Следующий() )
            return this.ПолучитьШаблонСообщения.ШаблонТекст;
        return '';
    }
    // Получаем шаблон письма из базы для завершения заявки
    get ТекстЗавершения(){
        this.ПолучитьШаблонСообщения.УстановитьПараметры( this.Работа.Фаза.Объект["Шаблон завершение"] );
        while( this.ПолучитьШаблонСообщения.Следудющий() )
            return this.ПолучитьШаблонСообщения.ШаблонТекст;
        return '';
    }
    // Отправка сообщения о завершении
    ОтправитьУведомление() {
        var сТема = this.Заголовок + " Завершение";
        var сТело = this.ТекстЗавершения;
        if( !сТело ) return "";
        сТело = this.ОбработатьШаблон( сТело );
        // todo нет html части уведомления
        this.Работа.Заявка.ОтправитьУведомление( this.Работа.Заявка.Объект['Карточка-Организация'], сТело, "", сТема, "", 2 );
    }
    // Отправка сообщения с предупреждением
    ОтправитьПредупреждение(){
        var сТема = this.Заголовок + " Предупреждение";
        var сТело = this.ТекстПредупреждения;
        if( !сТело ) return "";
        сТело = this.ОбработатьШаблон( сТело );
        // todo нет html части уведомления
        this.Работа.Заявка.ОтправитьУведомление( this.Работа.Заявка.Объект['Карточка-Организация'], сТело, "", сТема, "", 2 );
    }

    /**
     * Краткий шаблон и соответвия его объекту
     * @returns {Array}
     */
    get ВозможныеСоответствияШаблонов(){
        var Соответствия = [];
        Соответствия['Работа'] = 'this.Работа.Объект';
        Соответствия['Заявка'] = 'this.Работа.Заявка.Объект';
        Соответствия['Договор'] = 'this.Работа.Заявка.Договор.Объект';
        Соответствия['Организация'] = 'this.Работа.Заявка.Договор.Грузополучатель.Объект';
        Соответствия['Дата'] = 'new Date().format("dd.MM.yyyy")';
        Соответствия['Время'] = 'new Date().format("hh:mm")';
        Соответствия['Исполнитель'] = 'this.Исполнитель';
        Соответствия['ДатаЗакрытия'] = 'this.ДатаЗакрытия';
        return Соответствия;
    }
    /**
     * Заменяет шаблоны на значения из классов
     * @param Текст
     */
    ОбработатьШаблон( Текст ){
        var ПоискШаблонов= new RegExp( '%([^!]*)!', 'gi' );
        var Соответствия = this.ВозможныеСоответствияШаблонов;
        var Элемент;
        var Шаблон = '';
        var мПодстановки = [];
        var мШаблоны;
        var Дата = this.ДатаЗакрытия;
        while (( мШаблоны = ПоискШаблонов.exec(Текст)) !== null) {
            if (мШаблоны.index === ПоискШаблонов.lastIndex) {
                ПоискШаблонов.lastIndex++;
            }
            Шаблон = мШаблоны[1].split('.');
            if( !Соответствия[Шаблон[0]] ) continue;
            Элемент = Соответствия[Шаблон[0]] + ( Шаблон[1] ? '["' + Шаблон[1] + '"]' : '' );
            if( мПодстановки[Элемент] ) continue;
            try{
                мПодстановки[Элемент] = [];
                мПодстановки[Элемент].Значение = eval( Элемент );
                // На данном шаге нельзя определить тип данных, поэтому просто пытаемся все привести к формату
                try{
                    мПодстановки[Элемент].Значение = мПодстановки[Элемент].Значение.format("dd.MM.yyyy");
                }
                catch(er){

                }
                мПодстановки[Элемент].Поле = мШаблоны[0];
            }
            catch(er){
                мПодстановки[Элемент] = [];
                мПодстановки[Элемент].Значение = '!НЕИЗВЕСТНЫЙ ШАБЛОН(' +  мШаблоны[0] + ')!';
                мПодстановки[Элемент].Поле = мШаблоны[0];
            }
        }
        // Преобразуем текст
        for( let i in мПодстановки ){
            if(!мПодстановки.hasOwnProperty(i)) continue;
            Текст = Текст.replaceAll( мПодстановки[i].Поле,мПодстановки[i].Значение );
        }
        return Текст;
    }
}