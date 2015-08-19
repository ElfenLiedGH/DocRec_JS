'use strict'
// todo переименовать пункт меню "База данных" на этот диалог
class ДБлокировки extends БазовыйДиалог {
    constructor() {
        super('ДБлокировки');
    }

    /**
     * читает существующие блокировки на сервере и заполняет выборку внутри окна
     */
    static ПрочитатьБлокировки() {
        // определяем идентификатор нашего процесса
        var НашПроцесс = Query("SELECT TOP 1 host_process_id FROM SYS.dm_exec_sessions WHERE session_id =:1", 10, "S_ID,S");
        НашПроцесс.УстановитьПараметры(ServerInfo().ConnectionID);
        var нашПроцесс = НашПроцесс.Следующий() ? НашПроцесс.host_process_id : -1;

        // Перебираем все активные соединения по нашей базе и набираем их в выборку...
        var AllUsers = Query("SELECT db.name dbname, db.create_date, \
            db.recovery_model_desc [model], l.resource_description [desc], \
            l.request_mode [rmode], l.request_session_id, pro.host_process_id hostprocess, \
            pro.login_name loginame, pro.program_name, convert(varchar(20),pro.login_time,13) as time_login, \
            convert(varchar(20),pro.last_request_start_time,13) as last_batch, \
            cast( pro.context_info as varchar(128) ) as hostname, ltrim(rtrim(pro.status)) as status,\
            pro.cpu_time cpu, s.ФИО fullname \
         FROM SYS.dm_tran_locks l \
              LEFT JOIN sys.databases db ON db.database_id=l.resource_database_id \
              LEFT JOIN sys.dm_exec_sessions pro ON pro.session_id=l.request_session_id \
              JOIN master.dbo.sysprocesses old_pro ON old_pro.spid=pro.session_id \
              LEFT JOIN ~Пользователи~ p ON p.имя=pro.login_name \
              LEFT JOIN ~Сотрудники~ s ON s.ТабНомер = p.Номер \
         WHERE l.resource_type LIKE 'APPLICATION' \
         ORDER BY pro.host_process_id, hostname DESC", 100, "");

        var вБлокировки = ПолучитьВыборку("Блокировки");
        ОчиститьКоллекцию(вБлокировки, "Т");
        // Если на экране есть диалог сотрудника, берем только его блокировки
        var оСотр = View("Сотрудник","Сотрудник").Обработчик.Запись;
        var фио = "";
        if ( НомерЗаписи(оСотр) >= 0 ) фио = оСотр.ФИО;
        while ( AllUsers.Следующий() ) {
            var мПоз = AllUsers.desc.split(":");
            if ( мПоз[1] != undefined && (!фио || фио == AllUsers.fullname) ) {
                КопироватьПеременные(вБлокировки, AllUsers, 1);
                вБлокировки.НомерЗаписиВТаблице = -1;
                вБлокировки.ИмяТаблицы = "";
                вБлокировки.НашПроцесс = AllUsers.hostprocess == нашПроцесс ? 1 : 0;

                // блокировка записи выглядит так: номер записи в шестнадцатиричном виде + имя таблицы в кавычках
                var позр = мПоз[1].indexOf('"');
                if ( позр > 0 ) {
                    вБлокировки.НомерЗаписиВТаблице = Number("0x" + мПоз[1].substr(1, позр - 1));
                    вБлокировки.ИмяТаблицы = мПоз[1].substr(позр + 1, мПоз[1].length - позр - 3);
                    ВнестиЗаписьВыборки(вБлокировки);
                } else { // здесь видны блокировки входа в задачу и пользовательские блокировки (типа "Calc")
                    вБлокировки.ИмяТаблицы = мПоз[1].substr(1, мПоз[1].length - 2);

                    // не показывать блокировки входа в программу (но разрешить пользовательские блокировки)
                    if ( вБлокировки.ИмяТаблицы.toLowerCase() != "stack" ) {
                        вБлокировки.НомерЗаписиВТаблице = Number("0x" + мПоз[2].substr(1, мПоз[2].length - 1));
                        ВнестиЗаписьВыборки(вБлокировки);
                    }
                }
            }
        }
        ПеренабратьВыборку("Блокировки");
    }

    Инициализация() {
        ДБлокировки.ПрочитатьБлокировки();
    }

    Изменение() {
        ДБлокировки.ПрочитатьБлокировки();
    }
}

class Блокировки extends БазоваяВыборка {
    constructor() {
        super('Блокировки', 'ДБлокировки');
    }

    /**
     * Удаляет выбранные соединения, вызывается по клавише del в выборке
     */
    КП0() {
        this.ОтключитьПроцессы();
        ДБлокировки.ПрочитатьБлокировки();
    }

    /**
     * Удаляет выбранные блокировки
     */
    ОтключитьПроцессы() {
        if ( !ДаНет("Внимание ! Отключение активных пользователей может привести к ошибкам в базе данных. Продолжать ?") )
            return;

        var записи = this.ПолучитьВыделенныеЗаписи( false );
        for ( let нз of записи ) {
            ПрочитатьЗаписьТаблицы(this.Запись, нз);
            if ( this.Запись.НашПроцесс ) Сообщить("Запрещено удалять своё подключение !"); else
                Сотрудник.ОтключитьПроцесс(this.Запись.hostprocess, this.Запись.status.indexOf("runnable") != -1);
        }
    }
}