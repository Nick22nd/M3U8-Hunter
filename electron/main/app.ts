import { M3u8Service } from "../lib/m3u8.app";
import { DialogService } from "../service/dialog.service";

export class AppService {
    dialogService: DialogService
    m3u8Service: M3u8Service
    constructor(dialogService: DialogService, m3u8Service: M3u8Service) {
        this.dialogService = dialogService;
        this.m3u8Service = m3u8Service;
        this.init();
    }
    // registerService() {
    //     this.dialogService = new DialogService();
    //     this.m3u8Service = new M3u8Service(this.dialogService);
    // }   

    private init() {
        console.log('App init');
    }
}