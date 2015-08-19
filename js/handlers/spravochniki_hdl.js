'use strict';
/**
 * @extends БазоваяВыборка
 * @class  класс Организации
 */
class Организации extends БазоваяВыборка {
    constructor() {
        super("Организация", "Организации");
    }

    Расчет() {
        this.Запись['@ФИО_авт'] = this.Запись['Организация-Автор>ФИО'];
        this.Запись['@ФИО_ред'] = this.Запись['Организация-Редактор>ФИО'];
    }

    Цвет() {
        return this.ЦветЗаписи(this.Запись.Цвет % 8);
    }
}

/**
 * @extends БазовыйДиалог
 * @class класс Организация
 * @property {кОрганизация}  Организация Описание свойства организация
 */
class Организация extends БазовыйДиалог {
    constructor() {
        super( 'Организация' );
        /**
         * объект класса кОрганизация
         * @type {кОрганизация}
         */
        this.Организация = null;
    }

    Инициализация() {
        super.Инициализация();
        this.Организация = new кОрганизация( this.НомерЗаписи, this.Запись );
    }

    Изменение( Поле ) {
        super.Изменение();
        if ( this.Организация.ПроверитьКорректностьНазвания(this.Запись.Название, this.Запись.Наименование) ) {
            Сообщить("В названии не допускается ввод символов из разных алфавитов.");
            return Поле;
        }
    }

    /**
     * изменение электронного адреса организации (вызывается из Документооборота)
     */
    ИзменитьЭлАдрес(){
        var редакторАдреса = new кЭлектронныеАдреса( this.Запись.Название );
        if( редакторАдреса.Выполнить(this.Запись.email) ) this.Запись.email = редакторАдреса.СписокАдресов;
    }
}
/**
 * @extends БазоваяВыборка
 * @class класс Сотрудники - обработчик выборки 'Сотрудники' окна "Сотрудники"
 */
class Сотрудники extends БазоваяВыборка {
    constructor() {
        super('Сотрудники', 'Сотрудники');
        var задача = Задача();
        /**
         * открыли справочник в задаче Арм Администратора
         * @type {boolean}
         */
        this.ЭтоАДМ = задача.indexOf('администратор') != -1;
        /**
         * открыли справочник в задаче Аварийно-диспетчерская служба
         * @type {boolean}
         */
        this.ЭтоАДC = задача.indexOf('диспетчерская') != -1;
        this.БылоУдаление = false;
        /**
         * объект сотрудника
         * @type {кСотрудник}
         */
        this.Сотрудник = undefined;
        /**
         * запрос для чтения параметров логина сотрудника с сервера
         * @type {Query}
         */
        this.srv = Query( 'SELECT TOP 1 su.principal_id \
                         FROM [sys].database_principals u \
                              join [sys].server_principals su on su.name collate Cyrillic_General_CI_AS =u.name collate Cyrillic_General_CI_AS and su.[sid] = u.[sid] \
                         WHERE u.name = :1', 1, "user_name,A");
    }

    /**
     * Определяет, нужно ли выполнять действие для конкретной задачи
     * @returns {boolean} true, если справочник был открыт в задаче Арм Администратора или АДС, и false в противном случае
     */
    ВыполнитьСобытие() {
        return this.ЭтоАДМ || this.ЭтоАДC;
    }

    /**
     * заполняет инфомацию с сервера о сотруднике в Запись
     * @param имя - имя логина сотрудника
     */
    ДанныеПользователя( имя ) {
        var данныеПольз = Query('SELECT top 1 pro.host_process_id, pro.login_name, pro.program_name, \
                                      convert(varchar(20),pro.login_time,13) as login_time, \
                                      convert(varchar(20),pro.last_request_start_time,13) as last_batch, \
                                      cast( pro.context_info as varchar(128) ) as host_name, \
                                      ltrim(rtrim(pro.status)) as status, \
                                      pro.cpu_time, pro.session_id \
                               FROM sys.dm_exec_sessions pro join master.dbo.sysprocesses old_pro on old_pro.spid=pro.session_id \
                               WHERE old_pro.dbid = DB_ID() and pro.login_name = :1 \
                               ORDER BY host_name DESC', 1, "p1,A50");
        данныеПольз.УстановитьПараметры(имя);
        if ( данныеПольз.Следующий() ) {
            this.Запись.Хост = данныеПольз.host_name;
            this.Запись.Активность = данныеПольз.status;
            this.Запись.Вход = данныеПольз.login_time;
            this.Запись.Процесс = данныеПольз.program_name;
        }
    }

    ВерхнийУровеньВДО( корень, усл_папки ) {
        var верхнийУровень = -10;
        var зВерхнийУровень = Query('SELECT ROW_ID FROM ~ДО задания~ \
                                    WHERE ' + (усл_папки ? 'Папки_ADD = 0 AND ' : '') + '[Задание-исполнитель] = :1', 1, "rID,S");
        зВерхнийУровень.УстановитьПараметры(корень);
        Пока(зВерхнийУровень.Следующий())
        верхнийУровень = зВерхнийУровень.ROW_ID;
        return верхнийУровень;
    }

    Расчет() {
        if ( this.ЭтоАДC || !this.ВыполнитьСобытие() ) return 0;

        this.Запись.Пользователь = -1;
        this.Запись.Флаги = this.Запись.Хост = this.Запись.Процесс = this.Запись.Вход = this.Запись.Активность = "";
        this.Сотрудник = new кСотрудник(this.Запись);
        if ( this.Сотрудник.Узел ) return 0;
        // заполним вычисляемые поля
        var пользователь = this.Сотрудник.ПолучитьПользователей(true)[0];
        if ( пользователь != undefined ) {
            this.Запись.Пользователь = пользователь.ROW_ID;
            if ( пользователь.Ф1 % 2 ) this.Запись.Флаги += "А";
            if ( пользователь.Ф1 % 4 > 2 ) this.Запись.Флаги += "C";
            if ( пользователь.Ф2 % 4096 > 2048 ) this.Запись.Флаги += "З";
            this.ДанныеПользователя(пользователь.Имя);
        }
    }

    Цвет() {
        if ( this.ЭтоАДC || !this.ВыполнитьСобытие() ) return 0;

        if ( this.Сотрудник.Узел ) return this.ЦветЗаписи(0);
        if ( !this.Запись.Имя ) return this.ЦветЗаписи(14);
        if ( Пользователь().Имя == this.Запись.Имя ) return this.ЦветЗаписи(9);

        // проверим наличие логина на сервере
        this.srv.УстановитьПараметры(this.Запись.Имя);
        if ( !this.srv.Следующий() ) return this.ЦветЗаписи(1);
        return this.ЦветЗаписи(0);
    }

    Инициализация() {
        if ( !this.ВыполнитьСобытие() ) return 0;

        this.Запись.ТабНомер = this.МаксНомер(ЭтоУзел(this.Запись, "Сотрудники"));
        this.Запись.Принят = new Date();
    }

    Сохранение() {
        if ( !this.ВыполнитьСобытие() ) return 0;

        // сотрудник создается в инициализации, поэтому не проверяем
        if ( !this.Сотрудник.ПроверкаСотрудника() )
            return 1;
    }

    Модифицирована() {
        // todo нужно переписать со знатоками АДС
        if ( this.ЭтоАДC && ЭтоУзел(this.Запись, "Сотрудники") && !this.БылоУдаление ) {
            var идПапкаДО = 0;
            var зПоискПапкиВДО = Query('SELECT ROW_ID FROM ~ДО задания~ \
                                      WHERE Папки_ADD = 0 AND [Задание-исполнитель] = :1', 1, "rID,S");
            зПоискПапкиВДО.УстановитьПараметры(НомерЗаписи(this.Запись));
            while ( зПоискПапкиВДО.Следующий() )
                идПапкаДО = зПоискПапкиВДО.ROW_ID;
            // Папка есть - обновим примечание
            if ( идПапкаДО ) {
                var кОбновитьПримечаниевДО = Command('UPDATE ~ДО задания~ SET Примечание = :1 \
                                                   WHERE ROW_ID = :2', 1, "Name,A,rID,S");
                кОбновитьПримечаниевДО.Выполнить(ФИО, идПапкаДО);
                кОбновитьПримечаниевДО.Завершить();
            } else { // Папки нет - создадим
                var оЗадание = Объект("ДО задания");
                оЗадание.Примечание = ФИО;
                УстановитьПолеСвязи(оЗадание, "Задание-исполнитель", НомерЗаписи(this.Запись));
                УстановитьПолеСвязи(оЗадание, "Задание-Организация", ПрочитатьПолеСвязи(this.Запись, "Сотрудник-Организация"));
                УстановитьПолеСвязи(оЗадание, "Папки", ВерхнийУровеньВДО(this.Запись.Сотрудники, true));
                оЗадание.Папки_Узел = 1;
                ВнестиЗапись(оЗадание);
            }
        }
        this.БылоУдаление = false;
    }

    Перемещение() {
        if ( this.ЭтоАДC ) {
            var кОбновитьПривязку = command('UPDATE ~ДО задания~ SET Папки = :1 \
                                       WHERE Папки_ADD = 0 AND [Задание-исполнитель] = :2', 1, "Up,S,Down,S");
            кОбновитьПривязку.Выполнить(ВерхнийУровеньВДО(this.Запись.Сотрудники, false), НомерЗаписи(this.Запись));
            кОбновитьПривязку.Завершить();
        }
    }

    Удаление() { // Удаление сотрудника, удалим всех связанных пользователей
        if ( !this.ВыполнитьСобытие() ) return 0;

        // Если папка удаляется, все содержащиеся в ней папки переносятся на уровень выше, перенесем их в ДО
        if ( this.ЭтоАДC && ЭтоУзел(this.Запись, "Сотрудники") ) {
            // todo этот код неправильный, потому что в цикле удаялет одну и ту же папку
            this.Перемещение();
            var кУдалитьПапкуДо = Command('DELETE FROM ~ДО задания~ \
                                         WHERE Папки_ADD = 0 AND [Задание-исполнитель] = :1', 1, "rID,S");
            кУдалитьПапкуДо.Выполнить(НомерЗаписи(this.Запись));
            кУдалитьПапкуДо.Завершить();
            this.БылоУдаление = true;
        }
        this.Сотрудник = new кСотрудник(this.Запись);
        this.Сотрудник.УдалитьПользователей();
        ОбновитьЗапись(); // todo не работает че то
    }

    /**
     * Создает пароли выделенных в выборке пользователей и выводит информацию о сосзданных паролях в виде отчета
     */
    КП1() {
        return Сообщить('Обработчик недоступен пока не заработают отчеты!!'); // todo отчеты;

        if ( this.ЭтоАДC || !this.ВыполнитьСобытие() ) return 0;

        ВывестиСтатус("Подготовка списка пользователей для генерации паролей ...")
        var мЗаписи = this.ПолучитьВыделенныеЗаписи( false );
        ОчиститьИерархию("TempTable");
        for ( let нз of мЗаписи )
            if ( мЗаписи.hasOwnProperty(нз) )
                ЗаполнитьИерархию("TempTable", "Сотрудники", "Сотрудники", нз, "Сотрудники", 128);
        var зПольз = Query("SELECT us.Имя, us.row_id as [user], us.Ф1, us.Ф2, \
                                  sotr.ФИО, sotr.row_id as Сотрудник, sotr.ТабНомер, sotr.Телефон, us.Код \
                           FROM ~Пользователи~ us \
                                JOIN ~Сотрудники~ sotr ON sotr.ТабНомер = us.Номер \
                                JOIN [sys].database_principals u ON u.name = us.Имя \
                                JOIN [sys].server_principals su ON su.name=u.name AND su.[sid] = u.[sid] \
                                JOIN ~TempTable~ tt ON tt.row_id = sotr.row_id AND userid = :1 \
                           WHERE sotr.Сотрудники_ADD = 1 AND us.Имя!='SA' \
                           ORDER BY sotr.ФИО, Код", 100, "uid,S");
        var зПодр = Query("WITH child AS( \
                             SELECT ROW_ID, Сотрудники, Сотрудники_ADD, ФИО, Признаки, convert(varchar(100), '|') as sort \
                             FROM ~Сотрудники~ WHERE ROW_ID = :1 \
                             UNION ALL \
                             SELECT parent.ROW_ID, parent.Сотрудники, parent.Сотрудники_ADD, parent.ФИО, parent.Признаки, \
                                    convert(VARCHAR(100), child.sort + ' ') AS sort \
                             FROM ~Сотрудники~ parent \
                                  JOIN child ON child.Сотрудники = parent.ROW_ID \
                          ) \
                          SELECT ФИО, Сотрудники, sort FROM child WHERE Сотрудники_ADD=0 AND (Признаки & 1) > 0 \
                          ORDER BY sort DESC", 10, "sotr,S");
        var зГруппы = Query('SELECT gr.Название\
                            FROM ~Права~ pr \
                                 JOIN ~Группы~ gr ON pr.[Группы-Права]=gr.ROW_ID \
                            WHERE [Пользователи-Права]=:1', 10, "user,S");
        зПольз.УстановитьПараметры(ServerInfo().ConnectionID);

        var отчет = ПостроительОтчета("Birt");
        отчет.Имя(КаталогОтчетов() + "SHABLON\\ADMIN\\Список пользователей.rptdesign");
        отчет.УстановитьСвойство("ФОРМАТ", "pdf");
        var иОтчет = отчет.Источник("Отчет", 'Подразделение,A,ТабНомер,A,ФИО,A,Телефон,A,Должность,A,Таблица,L');
        иОтчет.Источник("Таблица", 'Код,A,Логин,A,Пароль,A,Признаки,A,Группы,A');

        var текТабНомер = -1;
        while ( зПольз.Следующий() ) {
            ВывестиСтатус("Генерация паролей ... " + зПольз.ФИО)
            var строкаОтч = {}, cотрудникОтч = {};
            строкаОтч['Пароль'] = кСотрудник.СгенеритьПароль();
            if ( кСотрудник.СменитьПарольПользователя(зПольз.Имя, строкаОтч['Пароль'], строкаОтч['Пароль']) ) {
                if ( зПольз.ТабНомер != текТабНомер ) {
                    if ( текТабНомер >= 0 ) // сохраним предыдущий, если он был
                        отчет.Добавить("Отчет", cотрудникОтч);
                    cотрудникОтч.Подразделение = "";
                    зПодр.УстановитьПараметры(зПольз.Сотрудник) // собрем строку с подразделением
                    while ( зПодр.Следующий() )
                        cотрудникОтч.Подразделение += (зПодр.Сотрудники > 0 ? "." : "") + зПодр.ФИО;
                    cотрудникОтч.ФИО = зПольз.ФИО;
                    cотрудникОтч.ТабНомер = зПольз.ТабНомер;
                    cотрудникОтч.Телефон = зПольз.Телефон;
                    текТабНомер = зПольз.ТабНомер;
                }
                строкаОтч.Логин = зПольз.Имя;
                строкаОтч.Код = зПольз.Код;
                зГруппы.УстановитьПараметры(зПольз.user);
                строкаОтч.Группы = "";
                while ( зГруппы.Следующий() )
                    строкаОтч.Группы += ( строкаОтч.Группы.length > 0 ? ", " : "") + зГруппы.Название;
                строкаОтч.Признаки = "";
                if ( зПольз.Ф1 % 2 > 1 ) строкаОтч.Признаки += "А";
                if ( зПольз.Ф1 % 4 > 2 ) строкаОтч.Признаки += "C";
                if ( зПольз.Ф2 % 4096 > 2048 ) строкаОтч.Признаки += "З";
                иОтчет.Добавить("Таблица", строкаОтч);
            }
        }
        if ( текТабНомер >= 0 ) // сохраним последний, если он был
            отчет.Добавить("Отчет", cотрудникОтч);
        ВывестиСтатус("Вывод данных в отчет... ")
        отчет.Отчет();
    }

    /**
     * Создание пользователей с генерацией логинов, если поле Логин пустое
     */
    КП2() {
        if ( this.ЭтоАДC || !this.ВыполнитьСобытие() ) return 0;

        ВывестиСтатус("Подготовка списка пользователей для генерации паролей ...")
        var мЗаписи = this.ПолучитьВыделенныеЗаписи( false );
        for ( let нз of мЗаписи )
            if ( мЗаписи.hasOwnProperty(нз) )
                ЗаполнитьИерархию("TempTable", "Сотрудники", "Сотрудники", нз, "Сотрудники", 128);

        var зПольз = Query('SELECT sotr.ФИО, sotr.ROW_ID as Сотрудник \
         FROM ~Сотрудники~ sotr \
              JOIN ~TempTable~ tt ON tt.row_id = sotr.ROW_ID AND userid = :1 \
         WHERE sotr.Сотрудники_ADD = 1 \
         ORDER BY sotr.ФИО', 100, "uid,S");
        зПольз.УстановитьПараметры(ServerInfo().ConnectionID);
        while ( зПольз.Следующий() ) {
            ВывестиСтатус("Создание учетных записей ... " + зПольз.ФИО);
            кСотрудник.СоздатьУдалитьПользователя(0, зПольз.Сотрудник);
        }
        ОбновитьСписокПользователей();
        ПеренабратьВыборку("Сотрудники")
        return 1;
    }

    /**
     * Определяет максимальной табельный номер внутри папок или записей из существующих в таблице
     * @param этоУзел - true - требуется определить номер для папок, false - для записей
     * @returns {number} - максимальный табельный номер + 1
     */
    МаксНомер( этоУзел ) {
        var зНомер = Query("SELECT MAX([ТабНомер]) AS [ТабНомер] FROM ~Сотрудники~ where Сотрудники_ADD = :1", 1, "p,S");
        зНомер.УстановитьПараметры(!этоУзел);
        var максНомер = зНомер.Следующий() ? зНомер.ТабНомер + 1 : 0;
        return максНомер;
    }
}

/**
 * @extends БазовыйДиалог
 * @class класс Сотрудник - обработчик окна диалога Сотрудник справочника Сотрудники
 */
class Сотрудник extends БазовыйДиалог {
    constructor() {
        super('Сотрудник');
    }

    /**
     * Читает данные пользоваетля с сервера
     * @param _имя - имя пользователя
     */
    ДанныеПользователя( _имя ) {
        var зДанныеПольз = Query('SELECT top 1 pro.host_process_id, pro.login_name, pro.program_name, \
                                        convert(varchar(20),pro.login_time,13) as login_time, \
                                        convert(varchar(20),pro.last_request_start_time,13) as last_batch, \
                                        cast( pro.context_info as varchar(128) ) as host_name, \
                                        ltrim(rtrim(pro.status)) as status, \
                                        pro.cpu_time, pro.session_id \
                                 FROM sys.dm_exec_sessions pro join master.dbo.sysprocesses old_pro on old_pro.spid=pro.session_id \
                                 WHERE old_pro.dbid = DB_ID() and pro.login_name = :1 \
                                 ORDER BY host_name DESC', 1, "p1,A50");
        зДанныеПольз.УстановитьПараметры(_имя);
        if ( зДанныеПольз.Следующий() ) {
            if ( зДанныеПольз.session_id != ServerInfo().ConnectionID )
                this.Источник.Элементы['Отключить'].Запрещен = false;
            this.Источник.Элементы['Блокировки'].Запрещен = false;
            this.Запись['@Хост'] = зДанныеПольз.host_name;
            this.Запись['@Статус'] = зДанныеПольз.status;
            this.Запись['@Операция'] = зДанныеПольз.last_batch;
            this.Запись['@Вход'] = зДанныеПольз.login_time;
            this.Запись['@Загрузка'] = зДанныеПольз.cpu_time;
            this.Запись['@proc_id'] = зДанныеПольз.host_process_id;
            this.Запись['@session_id'] = зДанныеПольз.session_id;
            this.Запись['@proc_name'] = зДанныеПольз.program_name;
        }
    }

    Инициализация() {
        this.Сотрудник = new кСотрудник(this.Запись, this.Запись['@Логин']);
        this.ЗапретитьЭлементыГруппы('Пользователь', "Отключить,Блокировки,Сменить,Права" );
        if ( ПрочитатьКонстанту(new Date(), "ВИДАУТЕНТИФ") == 2 ) { // Доменная аутентификация с использованием групп пользователей
            Group( this.ИмяДиалога, 'Имена входа' ).Скрытый = true;
            УстановитьПараметрыФильтра("Сотрудник", "@Пользователи сотрудника (при использовании групп)", "[Номер]=:1", "S", this.Сотрудник.ТабНомер);
        } else
            Group( this.ИмяДиалога, 'Имена входа (при использовании групп пользователей)' ).Скрытый = true;
        УстановитьПараметрыФильтра0(this.ИмяДиалога, "@Пользователи сотрудника", "Номер=:2", "S", this.Сотрудник.ТабНомер);

        this.Запись['@П1'] = this.Запись['@Ф1'] = this.Запись['@Ф2'] = 0;
        var пользователи = this.Сотрудник.ПолучитьПользователей(true);
        var зГруппы = Query('SELECT gr.Название \
                            FROM ~Права~ r JOIN ~Группы~ gr on gr.ROW_ID=r.[Группы-Права] \
                            WHERE [Пользователи-Права] = :1', 10, "uid,S");
        if ( пользователи[0] != undefined ) {
            зГруппы.УстановитьПараметры(пользователи[0].row_id);
            var оВыб = ПолучитьВыборку("@Группы сотрудника");
            while ( зГруппы.Следующий() ) {
                оВыб.Название = зГруппы.Название;
                ВнестиЗаписьВыборки(оВыб);
            }
            this.Запись['@Ф1'] = пользователи[0].Ф1;
            this.Запись['@Ф2'] = пользователи[0].Ф2;
            if ( пользователи[0].Ф1 >= 32768 )
                this.Запись['@П1'] = 32768; else if ( пользователи[0].Ф1 >= 16384 )
                this.Запись['@П1'] = 16384;

            if ( пользователи[0].Имя == "SA" ) // для SA скрываем кнопку
                this.Источник.Элементы['Создать'].Скрытый = true;
            // проверим наличие логина на сервере
            var зЛогин = Query('SELECT TOP 1 su.principal_id \
                              FROM [sys].database_principals u \
                                   JOIN [sys].server_principals su ON su.name collate Cyrillic_General_CI_AS =u.name collate Cyrillic_General_CI_AS \
                                        AND su.[sid] = u.[sid] \
                              WHERE u.name = :1', 1, "user_name,A");
            зЛогин.УстановитьПараметры(пользователи[0].Имя);
            if ( зЛогин.Следующий() ) // имя входа есть, можно запретить
                УстановитьЗаголовокЭлемента(this.ИмяДиалога, "Создать", "Запретить"); else                     // входа нет, можно разрешить
                УстановитьЗаголовокЭлемента(this.ИмяДиалога, "Создать", "Разрешить");

            this.ЗапретитьЭлементы( 'ТабНомер' );
            this.ЗапретитьЭлементыГруппы( 'Пользователь', '@Логин' );
            this.РазрешитьЭлементыГруппы( 'Пользователь', 'Сменить,Права' );
            this.Запись['@Логин'] = this.Сотрудник.Логин = пользователи[0].Имя;
            // Проверим активность пользователя
            this.ДанныеПользователя(пользователи[0].Имя);
        } else {
            this.Сотрудник.СоздатьЛогин();
            this.Запись['@Фамилия'] = this.Сотрудник.ФИО.Фамилия;
            this.Запись['@Имя'] = this.Сотрудник.ФИО.Имя;
            this.Запись['@Отчество'] = this.Сотрудник.ФИО.Отчество;
            this.Запись['@Логин'] = this.Сотрудник.Логин;
            // проверим, есть ли такой пользователь в базе, если существует, то добавим к нему его табельный номер
            var i = 0, тек_лог = this.Сотрудник.Логин;
            var пользователи = this.Сотрудник.ПолучитьПользователейЛогин(тек_лог, true);
            while ( пользователи.length > 0 ) {
                тек_лог = this.Сотрудник.Логин + ( this.Сотрудник.ТабНомер + i++ );
                пользователи = this.Сотрудник.ПолучитьПользователейЛогин(тек_лог, true);
            }
            if ( this.Сотрудник.Логин ) // меняем только тогда, когда логин действительно существовал (либо была введена фамилия и т.д.)
                this.Запись['@Логин'] = this.Сотрудник.Логин = тек_лог;
        }
    }

    Изменение( _поле ) {
        if ( _поле == "ФИО" ) {
            // Ищем, есть ли пользователи ссылающиеся на сотрудника
            var пользователи = this.Сотрудник.ПолучитьПользователей();
            this.Сотрудник.Фио = this.Запись.ФИО;
            if ( пользователи.length == 0 ) {
                this.Сотрудник.СоздатьЛогин();
                this.Запись['@Фамилия'] = this.Сотрудник.ФИО.Фамилия;
                this.Запись['@Имя'] = this.Сотрудник.ФИО.Имя;
                this.Запись['@Отчество'] = this.Сотрудник.ФИО.Отчество;
                this.Сотрудник.ПроверитьЛогин(); // здесь логин сотрудлника может измениться
                this.Запись['@Логин'] = this.Сотрудник.Логин;
            }
        } else if ( _поле == "@Логин" ) {
            this.Сотрудник.Логин = this.Запись['@Логин'];
            if ( this.Сотрудник.ПолучитьПользователейЛогин().length == 0 )
                return '';
            this.Сотрудник.ПроверитьЛогин();
            this.Запись['@Логин'] = this.Сотрудник.Логин;
            Сообщить("Такой логин занят другим пользователем");
            return "@Логин";
        }
    }

    Сохранение() {
        var кПольз = Command('UPDATE ~Пользователи~ \
                          SET Ф1 = :1, Ф2 = :2 WHERE Имя = :3', 1, "f1,S,f2,S,login,A");
        кПольз.Выполнить(ПрочитатьПолеСвязи(this.Запись, "@Ф1") + this.Запись['@П1'], ПрочитатьПолеСвязи(this.Запись, "@Ф1"), this.Сотрудник.Логин);
        кПольз.Завершить();
    }

    /**
     * Создание пользователей с генерацией логинов, если поле Логин пустое
     * @returns {number} - 1, если событие обработано
     */
    КП0() {
        кСотрудник.СоздатьУдалитьПользователя(1, this.Запись);
        ОбновитьСписокПользователей();
        return 1;
    }

    /**
     * сменить пароль для пользователя на сервере
     * @returns {number} - 1, если событие обработано
     */
    КП1() {
        кСотрудник.СменитьПарольПользователя(this.Запись['@Логин']);
        return 1;
    }

    /**
     * редактировать права пользователя
     * @returns {number} - 1, если событие обработано
     */
    КП2() {
        if ( this.Сотрудник.ПолучитьПользователей().length == 0 ) return 0;

        var вПольз = ПолучитьВыборку("Пользователи");
        ПрочитатьЗаписьТаблицы(вПольз, this.Сотрудник.ПолучитьПользователей()[0].ROW_ID);
        вПольз.Ф2 = this.Запись['@Ф2'];
        вПольз.Ф1 = ПрочитатьПолеСвязи(this.Запись, "@Ф1") + this.Запись['@П1'];
        вПольз.ПЛицо = НомерЗаписи(this.Запись);
        //js не работает
        if ( вПольз.Редактировать("Пользователь") ) {
            СохранитьЗапись(вПольз);

            this.Запись['@Ф2'] = вПольз.Ф2;
            this.Запись['@Ф1'] = вПольз.Ф1;
            if ( ПрочитатьПолеСвязи(вПольз, "Ф1") >= 32768 ) this.Запись['@П1'] = 32768; else if ( ПрочитатьПолеСвязи(вПольз, "Ф1") >= 16384 ) this.Запись['@П1'] = 16384;
            Перерисовать("Сотрудник");
        }
        return 1;
    }

    /**
     * отключить процесс этого пользователя
     */
    КП3() {
        this.Запись.status = this.Запись['@Статус'];
        this.Запись.session_id = this.Запись['@session_id'];
        Сотрудник.ОтключитьПроцесс(this.Запись['@proc_id'], this.Запись.status.indexOf("runnable") != -1);
    }

    /**
     * Удаляет все сессии процесса с указанным идентификатором
     * @param proc_id - id процесса пользователя на сервере
     * @param запущен - запущен ли процесс в данный момент
     */
    static ОтключитьПроцесс( proc_id, запущен ) {
        // Проверяем статус подключения
        if ( запущен ) {
            if ( !ДаНет("Идет выполнение запроса!\nВы уверены, что хотите удалить это подключение?") )
                return;
        }
        // Убиваем все сессии с нашим processID( command не работает )
        var зКилл = Query("DECLARE @sql nvarchar(max) \
                        SELECT @sql = isnull(@sql+';','') + 'kill '+cast(session_id as nvarchar) \
                        FROM sys.dm_exec_sessions WHERE host_process_id=:1; \
                        Exec (@sql)", 10, "p_id,S");
        зКилл.УстановитьПараметры(proc_id);
        зКилл.Следующий();
    }
}

/**
 * @extends БазовыйДиалог
 * @class класс Вид_параметров - обработчик окна диалога 'Вид параметров' справочника Виды параметров
 */
class Вид_параметров extends БазовыйДиалог {
    constructor(){
        super('Вид параметров');
    }
    Сохранение(){
        if( this.Запись.Название.length > 10 ){
            ВсплывающееОкно("Длина названия не может быть больше 10 символов", "Вид параметров", "Название" );
            return "Название";
        }
    }
}

/**
 * @extends БазоваяВыборка
 * @class класс Виды_состояний_документов - обработчик выборки 'Виды состояний документов' справочника "Виды состояний документов"
 * todo исправить диалог редактирования для папки (сейчас такой же как для листа)
 */
class Виды_состояний_документов extends БазоваяВыборка {
    constructor() {
        super('Виды состояний документов', 'Виды состояний документов');
    }
    Фильтр(){
        var зКорень = Query(" declare @root int; " +
            "SELECT @root = ROW_ID FROM ~Классификаторы~ " +
            "WHERE Тип=14 AND Папки = -10 AND Папки_ADD = 0 " +
            "IF (@root is null) BEGIN " +
            "   INSERT INTO ~Классификаторы~ ( Название, Тип, Папки, Папки_ADD ) " +
            "   VALUES ('Виды состояний документов', 14, -10, 0) " +
            "   SELECT @root = ROW_ID FROM ~Классификаторы~ " +
            "   WHERE Тип=14 AND Папки = -10 AND Папки_ADD = 0 " +
            "END " +
            "SELECT @root [root]", 1, "");
        зКорень.УстановитьПараметры();
        if( !зКорень.Следующий() ) return Ошибка("Не найден раздел Виды состояний документов!");

        var мФильтр = { 'Позиция' : зКорень.root };
        return мФильтр;
    }
    Цвет(){
        if( !this.Запись.Примечание ) {
            return ЦветЗаписи(0);
        }
        return this.Запись.Примечание;
    }
}

/**
 * @extends БазовыйДиалог
 * @class класс Вид_состояния_документа - обработчик окна диалога 'Вид состояния документа' выборки 'Виды состояний документов'
 */
class Вид_состояния_документа extends БазовыйДиалог {
    constructor() {
        super( 'Вид состояния документа' );
        this.мЦвета = [];
    }

    Инициализация() {
            // Примечание: *200.30.30;Шрифт*Пустой,К
        var цветШрифт = this.Запись.Примечание.indexOf( 'Шрифт' );

        var цвет = this.Запись.Примечание.substr( 0, цветШрифт - 1 );
        var шрифт = this.Запись.Примечание.substr( цветШрифт - 1 );

        var элЦвет = ComboBox( "Вид состояния документа", "@Цвет" );

        var дляЦета = new БазоваяВыборка();
        for( let инд in элЦвет.Список )
            this.мЦвета.push( дляЦета.ЦветЗаписи( элЦвет.Список[инд] ) );
        for( let i = 0; i < this.мЦвета.length; i++ ) {
            if( this.мЦвета[i] == цвет )
                this.Запись['@Цвет'] = i;
        }
        var пШрифт = 0;
        if( шрифт.indexOf( ",К" ) != -1 ) пШрифт += 1;
        if( шрифт.indexOf( ",Ж" ) != -1 ) пШрифт += 2;
        this.Запись['@Шрифт'] = пШрифт;
    }

    Сохранение() {
        var прим = "";
        if( this.мЦвета.hasOwnProperty(ПрочитатьПолеСвязи(this.Запись, "@Цвет")) ) {
            прим = this.мЦвета[ПрочитатьПолеСвязи(this.Запись, "@Цвет")];
        } else {
            ВсплывающееОкно( "Указанный цвет не может быть сохранен.", this.ИмяДиалога, "@Цвет" );
            return "@Цвет";
        }
        прим += ";Шрифт*Пустой";
        var шрифт = ПрочитатьПолеСвязи( this.Запись, "@Шрифт" );
        if( шрифт & 1 ) прим += ",К";
        if( шрифт & 2 ) прим += ",Ж";
        this.Запись.Примечание = прим + ";";
    }
}

/**
 * @extends _Почта_Входящие
 * @class класс Почта_Входящие - обработчик выборки 'Почта-Входящие'
 */
class Почта_Входящие extends _Почта_Входящие {
    constructor() {
        super( 'Почта-Входящие' );
    }
}
/**
 * @class класс Контакт_организации - обработчик окна диалога 'Контакт организации'
 * @extends БазовыйДиалог
 */
class Контакт_организации extends БазовыйДиалог {
    constructor() {
        super( arguments[0] ? arguments[0] : 'Контакт организации' );
        /**
         * объект для работы с ФИО в частном лице
         * @type {кЧеловек}
         */
        this.Фио = null;
    }
    Инициализация(){
        super.Инициализация();
        this.Фио = new кЧеловек( this.Запись.ФИО );
        this.Фио.РаспаковатьФио();
        this.Запись['@Фамилия'] = this.Фио.Фамилия;
        this.Запись['@Имя'] = this.Фио.Имя;
        this.Запись['@Отчество'] = this.Фио.Отчество;
    }
    Изменение( поле ){
        switch( поле ){
            case "@Фамилия":
            case "@Имя":
            case "@Отчество":
            case "@РФамилия": // чтобы не переписывать этот же код в наследнике
            case "@РИмя":
            case "@РОтчество":
            case "@ДФамилия":
            case "@ДИмя":
            case "@ДОтчество":
                eval( "this.Запись['" + поле + "']=кЧеловек.СЗаглавной(this.Запись['" + поле + "'])" );
                break;
        }
    }
    Сохранение(){
        this.Запись.ФИО = this.Фио.УпаковатьФио( this.Запись['@Фамилия'], this.Запись['@Имя'], this.Запись['@Отчество'] );
        if( !this.Запись.ФИО ) {
            Сообщить( "Не указана фамилия" );
            return "@Фамилия";
        }
        return "";
    }
    /**
     * изменение электронного адреса организации (вызывается из Документооборота)
     */
    ИзменитьЭлАдрес(){
        //Организация-Частные лица&gt;Название
        var редакторАдреса = new кЭлектронныеАдреса( this.Запись['Организация-Частные лица>Название'],
            this.Фио.УпаковатьФио(this.Запись['@Фамилия'], this.Запись['@Имя'], this.Запись['@Отчество']) );
        if( редакторАдреса.Выполнить(this.Запись.email) ) this.Запись.email = редакторАдреса.СписокАдресов;
    }
}

/**
 * @extends Контакт_организации
 * @class класс Организация_Частное_лицо - обработчик окна диалога 'Организация Частное лицо' выборки представителей
 */
class Организация_Частное_лицо extends Контакт_организации {
    constructor() {
        super( 'Организация Частное лицо' );
    }
    Инициализация(){
        super.Инициализация();
        this.Фио = new кЧеловек( this.Запись.РФИО );
        this.Фио.РаспаковатьФио();
        this.Запись['@РФамилия'] = this.Фио.Фамилия;
        this.Запись['@РИмя'] = this.Фио.Имя;
        this.Запись['@РОтчество'] = this.Фио.Отчество;

        this.Фио = new кЧеловек( this.Запись.ДФИО );
        this.Фио.РаспаковатьФио();
        this.Запись['@ДФамилия'] = this.Фио.Фамилия;
        this.Запись['@ДИмя'] = this.Фио.Имя;
        this.Запись['@ДОтчество'] = this.Фио.Отчество;
    }
    Сохранение(){
        var поле = super.Сохранение();
        if( поле ) return поле;

        this.Запись.РФИО = this.Фио.УпаковатьФио( this.Запись['@РФамилия'], this.Запись['@РИмя'], this.Запись['@РОтчество'] );
        this.Запись.ДФИО = this.Фио.УпаковатьФио( this.Запись['@ДФамилия'], this.Запись['@ДИмя'], this.Запись['@ДОтчество'] );
        return "";
    }
    СоздатьПарольWEB(){
        var отмСд = CheckBoxes( "Организация", "УстановленСД" );
        отмСд.Помечен[0] = 1;
        var Логин = ФИО(this.Запись.ФИО);
        Логин = Логин.replace(/[\s.]/g, "");
        if( !this.Запись.Логин ) {
            this.Запись.Логин = Логин;
        }
        var естьЛогин = 1;
        var зЛогин = Query("SELECT * FROM ~Частные лица~ WHERE [Логин] = :1 ", 1, "A,A");
        while( естьЛогин ){
            зЛогин.УстановитьПараметры( this.Запись.Логин );
            if( зЛогин.Следующий() ){
                this.Запись.Логин = Логин + "1";
            } else {
                естьЛогин = 0;
            }
        }
        this.Запись['@ПарольДля'] = кWEBtools.ПересоздатьПарольЛК( this.НомерЗаписи, 3, this.Запись.email );
    }
    УдалитьПарольWEB(){
        Сообщить( this.НоваяЗапись + "\n" + this.НомерЗаписи  )
        if( !this.НоваяЗапись ){
            if( ДаНет("Вы действительно хотите удалить логин и пароль?") ){
                this.Запись.логин = "";
                var удалПар = Command( `DELETE FROM ~Пароли~ WHERE [Пароль-Частные лица] = :1`, 1, "S,S" );
                удалПар.Выполнить( this.НомерЗаписи );
                удалПар.Завершить();
            }
        }
    }
}

/**
 * @extends БазоваяВыборка
 * @class класс Организация_Частные_лица - обработчик выборки 'Организация Частные лица' представителей организации
 */
class Организация_Частные_лица extends БазоваяВыборка {
    constructor() {
        super( 'Организация Частные лица', 'Организация' );
        this.зПоискПредставителя = Query( 'SELECT TOP 1 ROW_ID FROM ~Пароли~ WHERE [Пароль-Частные лица]=:1', 1, "S,S" );
    }
    Картинка(){
        this.зПоискПредставителя.УстановитьПараметры( НомерЗаписи(this.Запись) );
        if( this.зПоискПредставителя.Следующий() ) return "ФИО,5";
        return "";
    }
    Цвет(){
        if( this.Запись.Признаки == 1 ) return this.ЦветЗаписи( 'синий' );
        return this.ЦветЗаписи( 'черный' );
    }
}