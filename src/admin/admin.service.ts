import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Admin } from './admin.schema';
import { Model } from 'mongoose';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ISuccessResponse } from '../_global/interface/success-response';
import { LoginAdminDto } from './dto/login-admin.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name)
    private adminModel: Model<Admin>,
    private jwtService: JwtService,
  ) {}

  async create(createAdminDto: CreateAdminDto): Promise<ISuccessResponse> {
    try {
      const { fullName, email, password, role } = createAdminDto;
      let defaultPass: string;
      if (!password) {
        //   generate password
        const n = await this.adminModel.countDocuments();
        defaultPass = 'Password#' + (n + 1);
      }
      const admin = await this.adminModel.create({
        fullName,
        email,
        role,
        password: password || defaultPass,
      });
      const accessToken = this.jwtService.sign({ id: admin._id, email, role: admin.role });
      return {
        success: true,
        message: 'Admin created successfully',
        data: defaultPass ? admin : { admin, accessToken },
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async login(loginDto: LoginAdminDto): Promise<ISuccessResponse> {
    const { email, password } = loginDto;

    const admin = await this.adminModel.findOne({ email });
    if (!admin) throw new UnauthorizedException('Invalid login credentials');

    const isPasswordMatched = await bcrypt.compare(password, admin.password);
    if (!isPasswordMatched) throw new UnauthorizedException('Invalid login credentials');

    const accessToken = this.jwtService.sign({ id: admin._id, email, role: admin.role });
    return {
      success: true,
      message: 'Login successful',
      data: { admin, accessToken },
    };
  }

  async findAll(): Promise<ISuccessResponse> {
    const admins = await this.adminModel.find({}).sort({ createdAt: -1 });
    return {
      success: true,
      message: 'Admins fetched successfully',
      data: admins,
    };
  }

  async findProfile(): Promise<ISuccessResponse> {
    const admin = await this.adminModel.findOne({ id: 1 });
    if (!admin) {
      throw new NotFoundException('Admin with id does not exist');
    }
    return {
      success: true,
      message: 'Admin profile fetched successfully',
      data: admin,
    };
  }

  async updateProfile(updateAdminDto): Promise<ISuccessResponse> {
    const NON_EDITABLES = ['role', 'password'];
    NON_EDITABLES.forEach((key) => {
      delete updateAdminDto[key];
    });
    const admin = await this.adminModel.findOneAndUpdate({ id: 1 }, updateAdminDto, {
      new: true,
    });
    if (!admin) throw new NotFoundException('Admin with id does not exist');
    return {
      success: true,
      message: 'Admin profile updated successfully',
      data: admin,
    };
  }

  async updateRole(id: string, updateAdminDto): Promise<ISuccessResponse> {
    const { role } = updateAdminDto;
    const admin = await this.adminModel.findOneAndUpdate({ id }, { role }, { new: true });
    if (!admin) throw new NotFoundException('Admin with id does not exist');
    return {
      success: true,
      message: 'Admin role updated successfully',
      data: admin,
    };
  }

  async remove(id: string): Promise<ISuccessResponse> {
    const admin = await this.adminModel.findOneAndDelete({ id });
    if (!admin) throw new NotFoundException('Admin with id does not exist');
    return {
      success: true,
      message: 'Admin deleted successfully',
      data: admin,
    };
  }
}
